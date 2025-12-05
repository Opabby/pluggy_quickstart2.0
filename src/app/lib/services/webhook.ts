import { getPluggyClient } from '../pluggy/client';
import { itemsService } from './items';
import { accountsService } from './accounts';
import { transactionsService } from './transactions';
import { investmentsService } from './investments';
import { investmentTransactionsService } from './investment-transactions';
import { loansService } from './loans';
import { identityService } from './identity';
import { creditCardBillsService } from './credit-card-bills';
import type { 
  WebhookPayload, 
  AccountRecord, 
  TransactionRecord,
  InvestmentRecord,
  LoanRecord,
  IdentityRecord,
  CreditCardBillRecord,
  ItemWebhookPayload,
  TransactionsWebhookPayload 
} from '@/app/types/pluggy';

export async function processWebhookEvent(payload: WebhookPayload): Promise<void> {
  try {
    console.log(`🔄 Processing webhook event: ${payload.event} (${payload.eventId})`);
    console.log(`📋 Full payload:`, JSON.stringify(payload, null, 2));
    
    switch (payload.event) {
      case 'item/created':
      case 'item/updated':
      case 'item/login_succeeded':
        await handleItemEvent(payload as ItemWebhookPayload);
        break;

      case 'item/deleted':
        await handleItemDeleted(payload as ItemWebhookPayload);
        break;

      case 'item/error':
      case 'item/waiting_user_input':
        await handleItemStatusEvent(payload as ItemWebhookPayload);
        break;

      case 'transactions/created':
      case 'transactions/updated':
        await handleTransactionsCreated(payload as TransactionsWebhookPayload);
        break;

      case 'transactions/deleted':
        await handleTransactionsDeleted(payload as TransactionsWebhookPayload);
        break;

      case 'connector/status_updated':
        console.log('ℹ️ Connector status updated:', payload);
        break;

      default:
        console.warn(`⚠️ Unknown webhook event type: ${payload.event}`);
    }
    
    console.log(`✅ Successfully processed webhook event: ${payload.event}`);
  } catch (error) {
    console.error(`❌ Error processing webhook event ${payload.event}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      event: payload.event,
      eventId: payload.eventId,
    });
    throw error;
  }
}

async function handleItemEvent(payload: ItemWebhookPayload): Promise<void> {
  console.log(`📦 handleItemEvent called with payload:`, JSON.stringify(payload, null, 2));
  
  const itemId = payload.itemId || (payload as any).id || (payload as any).item_id;

  if (!itemId) {
    console.error('❌ Missing itemId in webhook payload:', {
      payload: JSON.stringify(payload, null, 2),
      keys: Object.keys(payload),
    });
    return;
  }
  
  console.log(`✅ Extracted itemId: ${itemId}`);
  console.log(`📦 Handling item event for itemId: ${itemId}`);

  const pluggyClient = getPluggyClient();

  try {
    // Fetch item data from Pluggy
    console.log(`🔍 Fetching item ${itemId} from Pluggy API...`);
    const item = await pluggyClient.fetchItem(itemId);
    console.log(`✅ Fetched item ${itemId} from Pluggy:`, {
      id: item.id,
      status: item.status,
      connectorId: item.connector?.id,
    });

    // Update item in database
    console.log(`💾 Saving item ${itemId} to database...`);
    const itemData = {
      item_id: item.id,
      connector_id: item.connector?.id?.toString(),
      connector_name: item.connector?.name,
      connector_image_url: item.connector?.imageUrl,
      status: item.status as 'UPDATED' | 'UPDATING' | 'WAITING_USER_INPUT' | 'LOGIN_ERROR' | 'OUTDATED' | 'CREATED' | undefined,
      last_updated_at: item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toISOString() : undefined,
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
      webhook_url: item.webhookUrl ?? undefined,
      consecutive_failed_login_attempts: item.consecutiveFailedLoginAttempts,
    };
    console.log(`📝 Item data to save:`, JSON.stringify(itemData, null, 2));
    
    console.log(`🔄 Calling itemsService.upsertItem...`);
    let savedItem;
    try {
      savedItem = await itemsService.upsertItem(itemData);
      console.log(`✅ itemsService.upsertItem completed successfully`);
      console.log(`✅ Saved item ${itemId} to database:`, {
        item_id: savedItem?.item_id,
        status: savedItem?.status,
      });
    } catch (dbError) {
      console.error(`❌ Database error in upsertItem:`, {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        name: dbError instanceof Error ? dbError.name : undefined,
        itemId,
        itemData: JSON.stringify(itemData, null, 2),
      });
      throw dbError;
    }

    // Sync accounts and transactions
    console.log(`🔄 Starting sync for item ${itemId}...`);
    await syncItemData(itemId);
    console.log(`✅ Completed sync for item ${itemId}`);
  } catch (error) {
    console.error(`❌ Error handling item event for ${itemId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      itemId,
    });
    throw error;
  }
}

/**
 * Handler for item deleted
 */
async function handleItemDeleted(payload: ItemWebhookPayload): Promise<void> {
  const { itemId } = payload;

  if (!itemId) {
    console.error('❌ Missing itemId in webhook payload:', payload);
    return;
  }

  try {
    await itemsService.deleteItem(itemId);
    console.log(`✅ Item ${itemId} deleted from database`);
  } catch (error) {
    console.error(`❌ Error deleting item ${itemId}:`, error);
    throw error;
  }
}

/**
 * Handler for item status events
 */
async function handleItemStatusEvent(payload: ItemWebhookPayload): Promise<void> {
  const { itemId } = payload;

  if (!itemId) {
    console.error('❌ Missing itemId in webhook payload:', payload);
    return;
  }

  try {
    const item = await itemsService.getItem(itemId);

    if (item) {
      // Update item status in database
      await itemsService.upsertItem({
        ...item,
        status: (payload as any).data?.status || item.status,
      });
      console.log(`✅ Updated status for item ${itemId}`);
    }
  } catch (error) {
    console.error(`❌ Error handling status event for ${itemId}:`, error);
    throw error;
  }
}

/**
 * Handler for transactions created/updated
 */
async function handleTransactionsCreated(payload: TransactionsWebhookPayload): Promise<void> {
  const { itemId, accountId } = payload;

  console.log(`💳 Handling transactions event - itemId: ${itemId}, accountId: ${accountId}`);

  if (!itemId) {
    console.error('❌ Missing itemId in transactions webhook payload:', payload);
    return;
  }

  if (!accountId) {
    console.warn('⚠️ Missing accountId in transactions webhook payload, will sync all accounts for item');
    // If no accountId, sync all accounts for the item
    await syncItemData(itemId);
    return;
  }

  const pluggyClient = getPluggyClient();

  try {
    // Fetch latest transactions from Pluggy
    const transactionsResponse = await pluggyClient.fetchTransactions(accountId);

    if (transactionsResponse.results && transactionsResponse.results.length > 0) {
      const transactions: TransactionRecord[] = transactionsResponse.results.map((tx: any) => ({
        account_id: accountId,
        transaction_id: tx.id,
        description: tx.description || '',
        description_raw: tx.descriptionRaw,
        amount: tx.amount,
        date: tx.date,
        balance: tx.balance,
        currency_code: tx.currencyCode || 'BRL',
        category: tx.category,
        category_id: tx.categoryId,
        provider_code: tx.providerCode,
        provider_id: tx.providerId,
        status: (tx.status || 'POSTED') as 'POSTED' | 'PENDING',
        type: tx.type as 'CREDIT' | 'DEBIT',
        operation_type: tx.operationType,
        operation_category: tx.operationCategory,
        payment_data: tx.paymentData,
        credit_card_metadata: tx.creditCardMetadata,
        merchant: tx.merchant,
      }));

      await transactionsService.upsertTransactions(transactions);
      console.log(`✅ Synced ${transactions.length} transactions for account ${accountId}`);
    } else {
      console.log(`ℹ️ No transactions found for account ${accountId}`);
    }
  } catch (error) {
    console.error(`❌ Error syncing transactions for account ${accountId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      itemId,
    });
    throw error;
  }
}

/**
 * Handler for transactions deleted
 */
async function handleTransactionsDeleted(payload: TransactionsWebhookPayload): Promise<void> {
  const { transactionIds } = payload;

  if (!transactionIds || !Array.isArray(transactionIds)) {
    console.error('❌ Missing or invalid transactionIds in webhook payload:', payload);
    return;
  }

}

/**
 * Sync all data for an item (accounts, transactions, investments, loans, identity, bills)
 */
async function syncItemData(itemId: string): Promise<void> {
  const pluggyClient = getPluggyClient();

  try {
    console.log(`🔄 Starting sync for item ${itemId}`);
    
    // Fetch and save accounts
    const accountsResponse = await pluggyClient.fetchAccounts(itemId);

    if (accountsResponse.results && accountsResponse.results.length > 0) {
      const accounts = accountsResponse.results
        .filter((account: any) => account.id)
        .map((account: any) => {
          const accountData: Omit<AccountRecord, 'id'> & { account_id: string; item_id: string; type: string; name: string } = {
            account_id: String(account.id),
            item_id: itemId,
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
          };
          return accountData as unknown as AccountRecord;
        });

      const savedAccounts = await accountsService.upsertMultipleAccounts(accounts);
      console.log(`✅ Saved ${savedAccounts.length} accounts for item ${itemId}`);

      // Sync transactions and bills for each account
      for (const account of savedAccounts) {
        try {
          // Sync transactions
          const transactionsResponse = await pluggyClient.fetchTransactions(
            account.account_id
          );

          if (transactionsResponse.results && transactionsResponse.results.length > 0) {
            const transactions: TransactionRecord[] = transactionsResponse.results.map((tx: any) => ({
              account_id: account.account_id,
              transaction_id: tx.id,
              description: tx.description || '',
              description_raw: tx.descriptionRaw,
              amount: tx.amount,
              date: tx.date,
              balance: tx.balance,
              currency_code: tx.currencyCode || 'BRL',
              category: tx.category,
              category_id: tx.categoryId,
              provider_code: tx.providerCode,
              provider_id: tx.providerId,
              status: (tx.status || 'POSTED') as 'POSTED' | 'PENDING',
              type: tx.type as 'CREDIT' | 'DEBIT',
              operation_type: tx.operationType,
              operation_category: tx.operationCategory,
              payment_data: tx.paymentData,
              credit_card_metadata: tx.creditCardMetadata,
              merchant: tx.merchant,
            }));

            await transactionsService.upsertTransactions(transactions);
            console.log(`✅ Synced ${transactions.length} transactions for account ${account.account_id}`);
          }

          // Sync credit card bills for credit accounts
          if (account.type === 'CREDIT') {
            try {
              const billsResponse = await pluggyClient.fetchCreditCardBills(account.account_id);
              const billsArray = billsResponse.results || [];

              if (billsArray.length > 0) {
                const billsToSave: CreditCardBillRecord[] = billsArray.map((bill: any) => ({
                  bill_id: bill.id,
                  account_id: account.account_id,
                  due_date: bill.dueDate,
                  total_amount: bill.totalAmount,
                  total_amount_currency_code: bill.totalAmountCurrencyCode,
                  minimum_payment_amount: bill.minimumPaymentAmount,
                  allows_installments: bill.allowsInstallments,
                  finance_charges: bill.financeCharges,
                }));

                await creditCardBillsService.upsertBills(billsToSave);
                console.log(`✅ Synced ${billsToSave.length} bills for account ${account.account_id}`);
              }
            } catch (error) {
              console.error(`❌ Error syncing bills for account ${account.account_id}:`, error);
            }
          }
        } catch (error) {
          console.error(
            `❌ Error syncing transactions/bills for account ${account.account_id}:`,
            error
          );
        }
      }
    } else {
      console.log(`ℹ️ No accounts found for item ${itemId}`);
    }

    // Sync investments
    try {
      const investmentsResponse = await pluggyClient.fetchInvestments(itemId);

      if (investmentsResponse.results && investmentsResponse.results.length > 0) {
        const investmentsToSave: InvestmentRecord[] = investmentsResponse.results.map((investment: any) => ({
          investment_id: investment.id,
          item_id: itemId,
          name: investment.name,
          code: investment.code,
          isin: investment.isin,
          number: investment.number,
          owner: investment.owner,
          currency_code: investment.currencyCode || 'BRL',
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
          status: investment.status || 'ACTIVE',
          institution: investment.institution,
          metadata: investment.metadata,
          provider_id: investment.providerId,
        }));

        const savedInvestments = await investmentsService.upsertInvestments(investmentsToSave);
        console.log(`✅ Saved ${savedInvestments.length} investments for item ${itemId}`);

        // Sync investment transactions
        for (const investment of savedInvestments) {
          try {
            const invTransactionsResponse = await pluggyClient.fetchInvestmentTransactions(
              investment.investment_id
            );

            if (invTransactionsResponse.results && invTransactionsResponse.results.length > 0) {
              const invTransactionsToSave = invTransactionsResponse.results.map((txn: any) => ({
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
              }));

              await investmentTransactionsService.upsertMultiple(invTransactionsToSave);
              console.log(`✅ Synced ${invTransactionsToSave.length} investment transactions for ${investment.investment_id}`);
            }
          } catch (error) {
            console.error(`❌ Error syncing investment transactions for ${investment.investment_id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error syncing investments for item ${itemId}:`, error);
    }

    // Sync loans
    try {
      const loansResponse = await pluggyClient.fetchLoans(itemId);

      if (loansResponse.results && loansResponse.results.length > 0) {
        const loansToSave: LoanRecord[] = loansResponse.results.map((loan: any) => ({
          loan_id: loan.id,
          item_id: itemId,
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
          installment_periodicity_additional_info: loan.installmentPeriodicityAdditionalInfo,
          amortization_scheduled: loan.amortizationScheduled,
          amortization_scheduled_additional_info: loan.amortizationScheduledAdditionalInfo,
          cnpj_consignee: loan.cnpjConsignee,
          interest_rates: loan.interestRates,
          contracted_fees: loan.contractedFees,
          contracted_finance_charges: loan.contractedFinanceCharges,
          warranties: loan.warranties,
          installments: loan.installments,
          payments: loan.payments,
        }));

        await loansService.upsertLoans(loansToSave);
        console.log(`✅ Saved ${loansToSave.length} loans for item ${itemId}`);
      }
    } catch (error) {
      console.error(`❌ Error syncing loans for item ${itemId}:`, error);
    }

    // Sync identity
    try {
      const identity = await pluggyClient.fetchIdentityByItemId(itemId);

      if (identity) {
        const identityToSave: IdentityRecord = {
          item_id: itemId,
          identity_id: identity.id,
          full_name: identity.fullName ?? undefined,
          company_name: identity.companyName ?? undefined,
          document: identity.document ?? undefined,
          document_type: identity.documentType ?? undefined,
          tax_number: identity.taxNumber ?? undefined,
          job_title: identity.jobTitle ?? undefined,
          birth_date: identity.birthDate ? new Date(identity.birthDate).toISOString() : undefined,
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

        await identityService.upsertIdentity(identityToSave);
        console.log(`✅ Synced identity for item ${itemId}`);
      }
    } catch (error: any) {
      // Identity might not exist for all items, 404 is acceptable
      if (error?.response?.status !== 404) {
        console.error(`❌ Error syncing identity for item ${itemId}:`, error);
      }
    }

    console.log(`✅ Completed full sync for item ${itemId}`);
  } catch (error) {
    console.error(`❌ Error syncing data for item ${itemId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      itemId,
    });
    throw error;
  }
}

