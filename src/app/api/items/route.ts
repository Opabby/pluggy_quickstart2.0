import { NextRequest, NextResponse } from "next/server";
import { getPluggyClient, hasPluggyCredentials } from "@/app/lib/pluggy/client";
import { itemsService } from "@/app/lib/supabase/services/items";
import { accountsService } from "@/app/lib/supabase/services/accounts";
import { transactionsService } from "@/app/lib/supabase/services/transactions";
import { identityService } from "@/app/lib/supabase/services/identity";
import { investmentsService } from "@/app/lib/supabase/services/investments";
import { loansService } from "@/app/lib/supabase/services/loans";
import { creditCardBillsService } from "@/app/lib/supabase/services/credit-card-bills";
import { investmentTransactionsService } from "@/app/lib/supabase/services/investment-transactions";
import type {
  AccountRecord,
  IdentityRecord,
  TransactionRecord,
  InvestmentRecord,
  LoanRecord,
  CreditCardBillRecord,
} from "@/app/types/pluggy";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const itemId = searchParams.get("itemId");

    if (itemId) {
      if (!hasPluggyCredentials()) {
        return NextResponse.json(
          { success: false, error: "Missing Pluggy credentials" },
          { status: 500 }
        );
      }

      const pluggyClient = getPluggyClient();
      const item = await pluggyClient.fetchItem(itemId);
      return NextResponse.json({ success: true, data: item });
    }

    const items = await itemsService.getItems(userId || undefined);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch items",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const itemData = await request.json();

    if (!itemData || !itemData.item_id) {
      return NextResponse.json(
        {
          success: false,
          error: "item_id is required",
          received: itemData,
        },
        { status: 400 }
      );
    }

    if (!hasPluggyCredentials()) {
      return NextResponse.json(
        { success: false, error: "Missing Pluggy credentials" },
        { status: 500 }
      );
    }

    const pluggyClient = getPluggyClient();

    const responseData: any = {
      success: true,
      item: null,
      accounts: [],
      identity: null,
      investments: [],
      loans: [],
      warnings: [],
    };

    const savedItem = await itemsService.upsertItem({
      item_id: itemData.item_id,
      user_id: itemData.user_id,
      connector_id: itemData.connector_id?.toString(),
      connector_name: itemData.connector_name,
      connector_image_url: itemData.connector_image_url,
      status: itemData.status,
      created_at: itemData.created_at,
      last_updated_at: itemData.last_updated_at,
      webhook_url: itemData.webhook_url,
    });
    responseData.item = savedItem;

    try {
      const accountsResponse = await pluggyClient.fetchAccounts(
        itemData.item_id
      );

      if (accountsResponse.results && accountsResponse.results.length > 0) {
        const accountsToSave = accountsResponse.results.map((account: any) => ({
          id: account.id || "", // Temporary id, will be generated/updated by database on upsert
          account_id: account.id,
          item_id: itemData.item_id,
          type: account.type,
          subtype: account.subtype,
          number: account.number,
          name: account.name,
          marketing_name: account.marketingName,
          balance: account.balance,
          currency_code: account.currencyCode,
          owner: account.owner,
          tax_number: account.taxNumber,
          bank_data: account.bankData,
          credit_data: account.creditData,
          disaggregated_credit_limits: account.disaggregatedCreditLimits,
        })) as AccountRecord[];

        const savedAccounts = await accountsService.upsertMultipleAccounts(
          accountsToSave
        );
        responseData.accounts = savedAccounts;

        const allTransactions: TransactionRecord[] = [];

        for (const account of savedAccounts) {
          try {
            const transactionsResponse = await pluggyClient.fetchTransactions(
              account.account_id
            );

            if (
              transactionsResponse.results &&
              transactionsResponse.results.length > 0
            ) {
              const transactionsToSave = transactionsResponse.results.map(
                (transaction: any) => {
                  const mapped = {
                    account_id: account.account_id,
                    transaction_id: transaction.id,
                    description: transaction.description,
                    description_raw: transaction.descriptionRaw,
                    amount: transaction.amount,
                    date: transaction.date,
                    balance: transaction.balance,
                    currency_code: transaction.currencyCode || "BRL",
                    category: transaction.category,
                    category_id: transaction.categoryId,
                    provider_code: transaction.providerCode,
                    provider_id: transaction.providerId,
                    status: transaction.status || "POSTED",
                    type: transaction.type,
                    operation_type: transaction.operationType,
                    operation_category: transaction.operationCategory,
                    payment_data: transaction.paymentData,
                    credit_card_metadata: transaction.creditCardMetadata,
                    merchant: transaction.merchant,
                  };
                  return mapped;
                }
              );

              allTransactions.push(...transactionsToSave);
            }
          } catch (transactionError) {
            responseData.warnings.push(
              `Failed to fetch transactions for account ${
                account.account_id
              }: ${
                transactionError instanceof Error
                  ? transactionError.message
                  : "Unknown error"
              }`
            );
          }
        }

        if (allTransactions.length > 0) {
          try {
            const savedTransactions =
              await transactionsService.upsertMultipleTransactions(
                allTransactions
              );
          } catch (saveError: any) {
            responseData.warnings.push(
              `Failed to save transactions: ${
                saveError instanceof Error ? saveError.message : "Unknown error"
              }`
            );
          }
        }

        const allBills: CreditCardBillRecord[] = [];

        for (const account of savedAccounts) {
          if (account.type === "CREDIT") {
            try {
              const billsResponse = await pluggyClient.fetchCreditCardBills(
                account.account_id
              );

              const billsArray = billsResponse.results || [];

              if (billsArray.length > 0) {
                const billsToSave = billsArray.map((bill: any) => ({
                  bill_id: bill.id,
                  account_id: account.account_id,
                  due_date: bill.dueDate,
                  total_amount: bill.totalAmount,
                  total_amount_currency_code: bill.totalAmountCurrencyCode,
                  minimum_payment_amount: bill.minimumPaymentAmount,
                  allows_installments: bill.allowsInstallments,
                  finance_charges: bill.financeCharges,
                }));

                allBills.push(...billsToSave);
              }
            } catch (billError) {
              responseData.warnings.push(
                `Failed to fetch bills for account ${account.account_id}: ${
                  billError instanceof Error
                    ? billError.message
                    : "Unknown error"
                }`
              );
            }
          }
        }

        if (allBills.length > 0) {
          try {
            await creditCardBillsService.upsertMultipleBills(allBills);
          } catch (saveError) {
            responseData.warnings.push(
              `Failed to save bills: ${
                saveError instanceof Error ? saveError.message : "Unknown error"
              }`
            );
          }
        }
      } else {
        responseData.accounts = [];
      }
    } catch (accountError) {
      responseData.warnings.push(
        "Failed to fetch/save accounts: " +
          (accountError instanceof Error
            ? accountError.message
            : "Unknown error")
      );
    }

    try {
      const identity = await pluggyClient.fetchIdentityByItemId(
        itemData.item_id
      );

      if (identity) {
        const identityToSave: IdentityRecord = {
          item_id: itemData.item_id,
          identity_id: identity.id,
          full_name: identity.fullName ?? undefined,
          company_name: identity.companyName ?? undefined,
          document: identity.document ?? undefined,
          document_type: identity.documentType ?? undefined,
          tax_number: identity.taxNumber ?? undefined,
          job_title: identity.jobTitle ?? undefined,
          birth_date: identity.birthDate
            ? new Date(identity.birthDate).toISOString()
            : undefined,
          addresses: identity.addresses
            ? identity.addresses.map((addr: any) => ({
                full_address: addr.fullAddress ?? undefined,
                primary_address: addr.primaryAddress ?? undefined,
                city: addr.city ?? undefined,
                postal_code: addr.postalCode ?? undefined,
                state: addr.state ?? undefined,
                country: addr.country ?? undefined,
                type: addr.type ?? undefined,
                additional_info: addr.additionalInfo ?? undefined,
                ...(addr as Record<string, unknown>),
              }))
            : undefined,
          phone_numbers: identity.phoneNumbers
            ? identity.phoneNumbers.map((phone: any) => ({
                type: phone.type ?? undefined,
                value: phone.value,
                ...(phone as Record<string, unknown>),
              }))
            : undefined,
          emails: identity.emails
            ? identity.emails.map((email: any) => ({
                type: email.type ?? undefined,
                value: email.value,
                ...(email as Record<string, unknown>),
              }))
            : undefined,
          relations: identity.relations
            ? identity.relations.map((rel: any) => ({
                type: rel.type ?? undefined,
                name: rel.name ?? undefined,
                document: rel.document ?? undefined,
                ...(rel as Record<string, unknown>),
              }))
            : undefined,
        };

        const savedIdentity = await identityService.upsertIdentity(
          identityToSave
        );
        responseData.identity = savedIdentity;
      }
    } catch (identityError: any) {
      if (identityError?.response?.status !== 404) {
        responseData.warnings.push(
          "Failed to fetch/save identity: " +
            (identityError instanceof Error
              ? identityError.message
              : "Unknown error")
        );
      }
    }

    try {
      const investmentsResponse = await pluggyClient.fetchInvestments(
        itemData.item_id
      );

      if (
        investmentsResponse.results &&
        investmentsResponse.results.length > 0
      ) {
        const investmentsToSave = investmentsResponse.results.map(
          (investment: any) => {
            const mapped = {
              investment_id: investment.id,
              item_id: itemData.item_id,
              name: investment.name,
              code: investment.code,
              isin: investment.isin,
              number: investment.number,
              owner: investment.owner,
              currency_code: investment.currencyCode || "BRL",
              type: investment.type,
              subtype: investment.subtype,
              last_month_rate: investment.lastMonthRate,
              last_twelve_months_rate: investment.lastTwelveMonthsRate,
              annual_rate: investment.annualRate,
              date: investment.date,
              value: investment.value,
              quantity: investment.quantity,
              amount: investment.amount,
              balance: investment.balance,
              taxes: investment.taxes,
              taxes2: investment.taxes2,
              due_date: investment.dueDate,
              rate: investment.rate,
              rate_type: investment.rateType,
              fixed_annual_rate: investment.fixedAnnualRate,
              issuer: investment.issuer,
              issue_date: investment.issueDate,
              amount_profit: investment.amountProfit,
              amount_withdrawal: investment.amountWithdrawal,
              amount_original: investment.amountOriginal,
              status: investment.status || "ACTIVE",
              institution: investment.institution,
              metadata: investment.metadata,
              provider_id: investment.providerId,
            };
            return mapped;
          }
        );

        const savedInvestments =
          await investmentsService.upsertMultipleInvestments(investmentsToSave);

        responseData.investments = savedInvestments;

        if (savedInvestments && savedInvestments.length > 0) {
          for (const investment of savedInvestments) {
            try {
              const invTransactionsResponse =
                await pluggyClient.fetchInvestmentTransactions(
                  investment.investment_id
                );

              if (
                invTransactionsResponse.results &&
                invTransactionsResponse.results.length > 0
              ) {
                const invTransactionsToSave = invTransactionsResponse.results.map(
                  (txn: any) => ({
                    transaction_id: txn.id,
                    investment_id: investment.investment_id,
                    trade_date: txn.tradeDate,
                    date: txn.date,
                    description: txn.description,
                    quantity: txn.quantity,
                    value: txn.value,
                    amount: txn.amount,
                    net_amount: txn.netAmount,
                    type: txn.type,
                    brokerage_number: txn.brokerageNumber,
                    expenses: txn.expenses,
                  })
                );
                
                await investmentTransactionsService.upsertMultiple(
                  invTransactionsToSave
                );
              }
            } catch (error) {
              responseData.warnings.push(
                `Failed to fetch investment transactions for investment ${
                  investment.investment_id
                }: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
          }
        }
      }
    } catch (investmentError: any) {
      responseData.warnings.push(
        "Failed to fetch/save investments: " +
          (investmentError instanceof Error
            ? investmentError.message
            : "Unknown error")
      );
    }

    try {
      const loansResponse = await pluggyClient.fetchLoans(itemData.item_id);

      if (loansResponse.results && loansResponse.results.length > 0) {
        const loansToSave = loansResponse.results.map((loan: any) => ({
          loan_id: loan.id,
          item_id: itemData.item_id,
          type: loan.type,
          product_name: loan.productName,
          contract_number: loan.contractNumber,
          ipoc_code: loan.ipocCode,
          provider_id: loan.providerId,
          date: loan.date,
          contract_date: loan.contractDate,
          disbursement_dates: loan.disbursementDates,
          settlement_date: loan.settlementDate,
          due_date: loan.dueDate,
          first_installment_due_date: loan.firstInstallmentDueDate,
          contract_amount: loan.contractAmount,
          currency_code: loan.currencyCode,
          cet: loan.cet,
          installment_periodicity: loan.installmentPeriodicity,
          installment_periodicity_additional_info:
            loan.installmentPeriodicityAdditionalInfo,
          amortization_scheduled: loan.amortizationScheduled,
          amortization_scheduled_additional_info:
            loan.amortizationScheduledAdditionalInfo,
          cnpj_consignee: loan.cnpjConsignee,
          interest_rates: loan.interestRates,
          contracted_fees: loan.contractedFees,
          contracted_finance_charges: loan.contractedFinanceCharges,
          warranties: loan.warranties,
          installments: loan.installments,
          payments: loan.payments,
        }));

        const savedLoans = await loansService.upsertMultipleLoans(loansToSave);
        responseData.loans = savedLoans;
      }
    } catch (loanError) {
      responseData.warnings.push(
        "Failed to fetch/save loans: " +
          (loanError instanceof Error ? loanError.message : "Unknown error")
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save item",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    if (!hasPluggyCredentials()) {
      return NextResponse.json(
        { success: false, error: "Missing Pluggy credentials" },
        { status: 500 }
      );
    }

    const pluggyClient = getPluggyClient();

    await pluggyClient.deleteItem(itemId);

    await itemsService.deleteItem(itemId);

    return NextResponse.json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete item",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}