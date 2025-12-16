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

export async function handleTransactionsDeleted(payload: TransactionsWebhookPayload): Promise<void> {
  const { transactionIds } = payload;

  if (!transactionIds || !Array.isArray(transactionIds)) {
    console.error('❌ Missing or invalid transactionIds in webhook payload:', payload);
    return;
  }
}