import { getPluggyClient } from "../../pluggy/client";
import { syncItemData } from "../sync.service";
import { transactionsService } from "../transactions";
import type { 
    TransactionRecord,
    TransactionsWebhookPayload
} from "@/app/types/pluggy";

export async function handleTransactionsCreated(payload: TransactionsWebhookPayload): Promise<void> {
  const { itemId, accountId } = payload;

  console.log(`💳 Handling transactions event - itemId: ${itemId}, accountId: ${accountId}`);

  if (!itemId) {
    console.error('❌ Missing itemId in transactions webhook payload:', payload);
    return;
  }

  if (!accountId) {
    console.warn('⚠️ Missing accountId in transactions webhook payload, will sync all accounts for item');
    await syncItemData(itemId);
    return;
  }

  const pluggyClient = getPluggyClient();

  try {
    const transactionsResponse = await pluggyClient.fetchTransactions(accountId);

    // TO-DO: remove mapping from handler and add it to /services/mappers/transactions.mapper.ts
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

export async function handleTransactionsDeleted(payload: TransactionsWebhookPayload): Promise<void> {
  const { transactionIds } = payload;

  if (!transactionIds || !Array.isArray(transactionIds)) {
    console.error('❌ Missing or invalid transactionIds in webhook payload:', payload);
    return;
  }

}