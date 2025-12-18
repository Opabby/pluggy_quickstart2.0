import { getPluggyClient } from '../pluggy/client';
import { accountsService } from './accounts';
import { transactionsService } from './transactions';
import { investmentsService } from './investments';
import { investmentTransactionsService } from './investment-transactions';
import { loansService } from './loans';
import { identityService } from './identity';
import { creditCardBillsService } from './credit-card-bills';
import { 
  Account,
  Transaction,
  Investment,
  InvestmentTransaction,
  Loan,
} from 'pluggy-sdk';
import { CreditCardBills } from 'pluggy-sdk/dist/types/creditCardBills';
import type { 
  AccountRecord, 
  TransactionRecord,
  InvestmentRecord,
  LoanRecord,
  IdentityRecord,
  CreditCardBillRecord,
} from '@/app/types/pluggy';
import { mapAccountFromPluggyToDb } from './mappers/account.mapper';
import { mapTransactionFromPluggyToDb } from './mappers/transaction.mapper';
import { mapCreditCardBillFromPluggyToDb } from './mappers/credit-card-bill.mapper';
import { mapInvestmentFromPluggyToDb } from './mappers/investment.mapper';
import { mapInvestmentTransactionFromPluggyToDb } from './mappers/investment-transaction.mapper';
import { mapLoanFromPluggyToDb } from './mappers/loan.mapper';
import { mapIdentityFromPluggyToDb } from './mappers/identity.mapper';

const pluggyClient = getPluggyClient();

export async function syncItemData(itemId: string): Promise<void> {
  try {
    const accountsResponse = await pluggyClient.fetchAccounts(itemId);

    if (accountsResponse.results && accountsResponse.results.length > 0) {
      const accounts = accountsResponse.results
        .filter((account: Account) => account.id)
        .map((account: Account) => mapAccountFromPluggyToDb(account, itemId) as AccountRecord);

      const savedAccounts = await accountsService.upsertAccounts(accounts);

      for (const account of savedAccounts) {
        try {
          const transactionsResponse = await pluggyClient.fetchTransactions(
            account.account_id
          );

          if (transactionsResponse.results && transactionsResponse.results.length > 0) {
            const transactions: TransactionRecord[] = transactionsResponse.results.map((tx: Transaction) => 
              mapTransactionFromPluggyToDb(tx, account.account_id) as TransactionRecord
            );

            await transactionsService.upsertTransactions(transactions);
          }

          if (account.type === 'CREDIT') {
            try {
              const billsResponse = await pluggyClient.fetchCreditCardBills(account.account_id);
              const billsArray = billsResponse.results || [];

              if (billsArray.length > 0) {
                const billsToSave: CreditCardBillRecord[] = billsArray.map((bill: CreditCardBills) => 
                  mapCreditCardBillFromPluggyToDb(bill, account.account_id) as CreditCardBillRecord
                );

                await creditCardBillsService.upsertBills(billsToSave);
              }
            } catch (error) {
              console.error(`Error syncing bills for account ${account.account_id}:`, error);
            }
          }
        } catch (error) {
          console.error(
            `Error syncing transactions/bills for account ${account.account_id}:`,
            error
          );
        }
      }
    }

    try {
      const investmentsResponse = await pluggyClient.fetchInvestments(itemId);

      if (investmentsResponse.results && investmentsResponse.results.length > 0) {
        const investmentsToSave: InvestmentRecord[] = investmentsResponse.results.map((investment: Investment) => 
          mapInvestmentFromPluggyToDb(investment) as InvestmentRecord
        );

        const savedInvestments = await investmentsService.upsertInvestments(investmentsToSave);

        for (const investment of savedInvestments) {
          try {
            const invTransactionsResponse = await pluggyClient.fetchInvestmentTransactions(
              investment.investment_id
            );

            if (invTransactionsResponse.results && invTransactionsResponse.results.length > 0) {
              const invTransactionsToSave = invTransactionsResponse.results.map((txn: InvestmentTransaction) => 
                mapInvestmentTransactionFromPluggyToDb(txn, investment.investment_id)
              );

              await investmentTransactionsService.upsertTransactions(invTransactionsToSave);
            }
          } catch (error) {
            console.error(`Error syncing investment transactions for ${investment.investment_id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing investments for item ${itemId}:`, error);
    }

    try {
      const loansResponse = await pluggyClient.fetchLoans(itemId);

      if (loansResponse.results && loansResponse.results.length > 0) {
        const loansToSave: LoanRecord[] = loansResponse.results.map((loan: Loan) => 
          mapLoanFromPluggyToDb(loan) as LoanRecord
        );

        await loansService.upsertLoans(loansToSave);
      }
    } catch (error) {
      console.error(`Error syncing loans for item ${itemId}:`, error);
    }

    try {
      const identity = await pluggyClient.fetchIdentityByItemId(itemId);

      if (identity) {
        const identityToSave = mapIdentityFromPluggyToDb(identity) as IdentityRecord;

        await identityService.upsertIdentity(identityToSave);
      }
    } catch (error: unknown) {
      const httpError = error as { response?: { status?: number } };
      if (httpError?.response?.status !== 404) {
        console.error(`Error syncing identity for item ${itemId}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error syncing data for item ${itemId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      itemId,
    });
    throw error;
  }
}

export async function syncAccountData(itemId: string): Promise<void> {
  try {
    const accountsResponse = await pluggyClient.fetchAccounts(itemId);

    if (accountsResponse.results && accountsResponse.results.length > 0) {
      const accounts = accountsResponse.results
        .filter((account: Account) => account.id)
        .map((account: Account) => mapAccountFromPluggyToDb(account, itemId) as AccountRecord);

      await accountsService.upsertAccounts(accounts);
    }
  } catch (error) {
    console.error(`Error syncing accounts for item ${itemId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      itemId,
    });
    throw error;
  }
}
