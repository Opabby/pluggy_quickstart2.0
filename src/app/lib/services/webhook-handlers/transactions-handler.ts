import { getPluggyClient } from "../../pluggy/client";
import { syncAccountData } from "../item-sync.service";
import { transactionsService } from "../transactions";
import { creditCardBillsService } from "../credit-card-bills";
import { accountsService } from "../accounts";
import { mapTransactionFromPluggyToDb } from "../mappers/transaction.mapper";
import { mapCreditCardBillFromPluggyToDb } from "../mappers/credit-card-bill.mapper";
import { Transaction } from "pluggy-sdk";
import { CreditCardBills } from 'pluggy-sdk/dist/types/creditCardBills';
import { WebhookEventPayload } from 'pluggy-sdk';
import type { 
    TransactionRecord,
    TransactionsWebhookPayload,
    CreditCardBillRecord,
} from "@/app/types/pluggy";

const pluggyClient = getPluggyClient();

export async function handleTransactionsCreated({ accountId, itemId }: Extract<WebhookEventPayload, { event: 'transactions/created' }>): Promise<void> {
  try {
    const accountExists = await accountsService.getAccountById(accountId);

    if (!accountExists) {
      await syncAccountData(itemId);
    }

    await syncTransactionData(accountId);

    const account = await accountsService.getAccountById(accountId);
    if (account?.type === 'CREDIT') {
      await syncCreditCardBillData(accountId);
    }
  } catch (error) {
    console.error(`Error handling transactions created for account ${accountId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      itemId,
    });
    throw error;
  }
}

export async function handleTransactionsUpdated({transactionIds = [], accountId = '', itemId}: TransactionsWebhookPayload): Promise<void> {
  const MAX_PAGE_SIZE = 500;
  const allTransactions: Transaction[] = [];

  try {
    const totalPages = Math.ceil(transactionIds.length / MAX_PAGE_SIZE);
    
    for (let page = 1; page <= totalPages; page++) {
      const from = (page - 1) * MAX_PAGE_SIZE;
      const to = page * MAX_PAGE_SIZE;
      
      const batchIds = transactionIds.slice(from, to);

      const transactionsResponse = await pluggyClient.fetchTransactions(accountId, {
        ids: batchIds
      });

      if (transactionsResponse.results && transactionsResponse.results.length > 0) {
        allTransactions.push(...transactionsResponse.results);
      }
    }

    if (allTransactions.length === 0) return;

    const transactionsToUpsert: TransactionRecord[] = allTransactions.map((tx: Transaction) => 
      mapTransactionFromPluggyToDb(tx, accountId) as TransactionRecord
    );

    await transactionsService.upsertTransactions(transactionsToUpsert);
  } catch (error) {
    console.error(`Error updating transactions for account ${accountId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      itemId,
    });
    throw error;
  }
}

export async function handleTransactionsDeleted({transactionIds = []}: TransactionsWebhookPayload): Promise<void> {
  try {
    if (transactionIds.length === 0) return;

    await transactionsService.deleteTransactions(transactionIds);
  } catch (error) {
    console.error(`Error deleting transactions:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      transactionIds,
    });
    throw error;
  }
}

export async function syncTransactionData(accountId: string): Promise<void> {
  try {
    const allTransactions = await pluggyClient.fetchAllTransactions(accountId);

    if (allTransactions.length > 0) {
      const transactions: TransactionRecord[] = allTransactions.map((tx: Transaction) => 
        mapTransactionFromPluggyToDb(tx, accountId) as TransactionRecord
      );

      await transactionsService.upsertTransactions(transactions);
    }
  } catch (error) {
    console.error(`Error syncing transactions for account ${accountId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
    });
    throw error;
  }
}

export async function syncCreditCardBillData(accountId: string): Promise<void> {
  try {
    const billsResponse = await pluggyClient.fetchCreditCardBills(accountId);
    const billsArray = billsResponse.results || [];

    if (billsArray.length > 0) {
      const billsToSave: CreditCardBillRecord[] = billsArray.map((bill: CreditCardBills) => 
        mapCreditCardBillFromPluggyToDb(bill, accountId) as CreditCardBillRecord
      );

      await creditCardBillsService.upsertBills(billsToSave);
    }
  } catch (error) {
    console.error(`Error syncing credit card bills for account ${accountId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
    });
    throw error;
  }
}