import { getPluggyClient } from "../../pluggy/client";
import { syncItemData } from "../item-sync.service";
import { transactionsService } from "../transactions";
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
      console.log(`Synced ${transactions.length} transactions for account ${accountId}`);
    } else {
      console.log(`No transactions found for account ${accountId}`);
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

export async function handleTransactionsUpdated(payload: TransactionsWebhookPayload): Promise<void> {
  const { transactionIds, accountId, itemId } = payload;
  
  // Validate required fields
  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    console.error('❌ Missing or invalid transactionIds in webhook payload:', payload);
    return;
  }

  if (!accountId) {
    console.error('❌ Missing accountId in webhook payload:', payload);
    return;
  }

  const MAX_PAGE_SIZE = 500;
  const allTransactions: Transaction[] = [];

  try {
    console.log(`🔄 Processing ${transactionIds.length} updated transactions for account ${accountId}`);

    const totalPages = Math.ceil(transactionIds.length / MAX_PAGE_SIZE);
    
    for (let page = 1; page <= totalPages; page++) {
      const from = (page - 1) * MAX_PAGE_SIZE;
      const to = page * MAX_PAGE_SIZE;
      
      const batchIds = transactionIds.slice(from, to);
      console.log(`📦 Fetching batch ${page}/${totalPages} (${batchIds.length} transactions)`);

      const transactionsResponse = await pluggyClient.fetchTransactions(accountId, {
        ids: batchIds
      });

      if (transactionsResponse.results && transactionsResponse.results.length > 0) {
        allTransactions.push(...transactionsResponse.results);
      }
    }

    // Map and upsert transactions to database
    if (allTransactions.length > 0) {
      const transactionsToUpsert: TransactionRecord[] = allTransactions.map((tx: Transaction) => 
        mapTransactionFromPluggyToDb(tx, accountId) as TransactionRecord
      );

      await transactionsService.upsertTransactions(transactionsToUpsert);
      console.log(`✅ Successfully updated ${transactionsToUpsert.length} transactions for account ${accountId}`);
    } else {
      console.log(`⚠️ No transactions found to update for account ${accountId}`);
    }
  } catch (error) {
    console.error(`❌ Error updating transactions for account ${accountId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      itemId,
      transactionIds: transactionIds.slice(0, 5), // Log only first 5 IDs to avoid clutter
      totalTransactions: transactionIds.length,
    });
    throw error;
  }
}

export async function handleTransactionsDeleted(payload: TransactionsWebhookPayload): Promise<void> {
  const { transactionIds } = payload;

  if (!transactionIds || !Array.isArray(transactionIds)) {
    console.error('❌ Missing or invalid transactionIds in webhook payload:', payload);
    return;
  }
}