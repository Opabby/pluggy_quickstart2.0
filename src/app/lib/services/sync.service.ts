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
import { handleItemEvent } from './webhook-handlers/item-handler';
import { handleItemDeleted, handleItemStatusEvent } from './webhook-handlers/item-handler';
import { handleTransactionsCreated, handleTransactionsDeleted } from './webhook-handlers/transactions-handler';
import { mapAccountFromPluggyToDb } from './mappers/account.mapper';
import { mapTransactionFromPluggyToDb } from './mappers/transaction.mapper';
import { mapCreditCardBillFromPluggyToDb } from './mappers/credit-card-bill.mapper';
import { mapInvestmentFromPluggyToDb } from './mappers/investment.mapper';
import { mapInvestmentTransactionFromPluggyToDb } from './mappers/investment-transaction.mapper';
import { mapLoanFromPluggyToDb } from './mappers/loan.mapper';
import { mapIdentityFromPluggyToDb } from './mappers/identity.mapper';

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

export async function syncItemData(itemId: string): Promise<void> {
  const pluggyClient = getPluggyClient();

  try {
    console.log(`🔄 Starting sync for item ${itemId}`);

    const accountsResponse = await pluggyClient.fetchAccounts(itemId);

    if (accountsResponse.results && accountsResponse.results.length > 0) {
      const accounts = accountsResponse.results
        .filter((account: Account) => account.id)
        .map((account: Account) => mapAccountFromPluggyToDb(account, itemId) as AccountRecord);

      const savedAccounts = await accountsService.upsertAccounts(accounts);
      console.log(`✅ Saved ${savedAccounts.length} accounts for item ${itemId}`);

      // Sync transactions and bills for each account
      for (const account of savedAccounts) {
        try {
          // Sync transactions
          const transactionsResponse = await pluggyClient.fetchTransactions(
            account.account_id
          );

          if (transactionsResponse.results && transactionsResponse.results.length > 0) {
            const transactions: TransactionRecord[] = transactionsResponse.results.map((tx: Transaction) => 
              mapTransactionFromPluggyToDb(tx, account.account_id) as TransactionRecord
            );

            await transactionsService.upsertTransactions(transactions);
            console.log(`✅ Synced ${transactions.length} transactions for account ${account.account_id}`);
          }

          // Sync credit card bills for credit accounts
          if (account.type === 'CREDIT') {
            try {
              const billsResponse = await pluggyClient.fetchCreditCardBills(account.account_id);
              const billsArray = billsResponse.results || [];

              if (billsArray.length > 0) {
                const billsToSave: CreditCardBillRecord[] = billsArray.map((bill: CreditCardBills) => 
                  mapCreditCardBillFromPluggyToDb(bill, account.account_id) as CreditCardBillRecord
                );

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
        const investmentsToSave: InvestmentRecord[] = investmentsResponse.results.map((investment: Investment) => 
          mapInvestmentFromPluggyToDb(investment) as InvestmentRecord
        );

        const savedInvestments = await investmentsService.upsertInvestments(investmentsToSave);
        console.log(`✅ Saved ${savedInvestments.length} investments for item ${itemId}`);

        // Sync investment transactions
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
        const loansToSave: LoanRecord[] = loansResponse.results.map((loan: Loan) => 
          mapLoanFromPluggyToDb(loan) as LoanRecord
        );

        await loansService.upsertLoans(loansToSave);
        console.log(`✅ Saved ${loansToSave.length} loans for item ${itemId}`);
      }
    } catch (error) {
      console.error(`❌ Error syncing loans for item ${itemId}:`, error);
    }

    try {
      const identity = await pluggyClient.fetchIdentityByItemId(itemId);

      if (identity) {
        const identityToSave = mapIdentityFromPluggyToDb(identity) as IdentityRecord;

        await identityService.upsertIdentity(identityToSave);
        console.log(`✅ Synced identity for item ${itemId}`);
      }
    } catch (error: unknown) {
      // Check if it's an HTTP error with 404 status (identity not found is acceptable)
      const httpError = error as { response?: { status?: number } };
      if (httpError?.response?.status !== 404) {
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