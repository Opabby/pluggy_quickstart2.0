import { getPluggyClient } from "../../pluggy/client";
import { syncItemData } from "../item-sync.service";
import { transactionsService } from "../transactions";
import { investmentTransactionsService } from "../investment-transactions";
import { mapTransactionFromPluggyToDb } from "../mappers/transaction.mapper";
import { Transaction } from "pluggy-sdk";
import { WebhookEventPayload } from 'pluggy-sdk';
import type { 
    TransactionRecord,
    TransactionsWebhookPayload
} from "@/app/types/pluggy";
import { accountsService } from "../accounts";

const pluggyClient = getPluggyClient();

export async function handleTransactionsCreated({ accountId, itemId }: Extract<WebhookEventPayload, { event: 'transactions/created' }>): Promise<void> {
  try {
    const accountExists = await accountsService.getAccountById(accountId);

    if (!accountExists) {
      await syncItemData(itemId);
    }

    const transactionsResponse = await pluggyClient.fetchTransactions(accountId);

    if (transactionsResponse.results && transactionsResponse.results.length > 0) {
      const transactions: TransactionRecord[] = transactionsResponse.results.map((tx: Transaction) => 
        mapTransactionFromPluggyToDb(tx, accountId) as TransactionRecord
      );

      await transactionsService.upsertTransactions(transactions);
    }
  } catch (error) {
    console.error(`Error syncing transactions for account ${accountId}:`, {
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

    if (allTransactions.length > 0) {
      const transactionsToUpsert: TransactionRecord[] = allTransactions.map((tx: Transaction) => 
        mapTransactionFromPluggyToDb(tx, accountId) as TransactionRecord
      );

      await transactionsService.upsertTransactions(transactionsToUpsert);
    }
  } catch (error) {
    console.error(`❌ Error updating transactions for account ${accountId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      itemId,
      transactionIds: transactionIds.slice(0, 5),
      totalTransactions: transactionIds.length,
    });
    throw error;
  }
}

export async function handleTransactionsDeleted({transactionIds = []}: TransactionsWebhookPayload): Promise<void> {
  await transactionsService.deleteTransactions(transactionIds);
  await investmentTransactionsService.deleteInvestmentTransactions(transactionIds);
}