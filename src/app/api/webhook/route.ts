import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient, hasPluggyCredentials } from '@/app/lib/pluggy/client';
import { itemsService } from '@/app/lib/supabase/services/items';
import { accountsService } from '@/app/lib/supabase/services/accounts';
import { transactionsService } from '@/app/lib/supabase/services/transactions';
import type { 
  WebhookPayload, 
  AccountRecord, 
  TransactionRecord,
  ItemWebhookPayload,
  TransactionsWebhookPayload 
} from '@/app/types/pluggy';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST: Handle webhook events
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WebhookPayload;

    console.log('📥 Webhook received:', {
      event: payload.event,
      eventId: payload.eventId,
      url: request.url,
      method: request.method,
    });

    if (!payload.event || !payload.eventId) {
      console.error('❌ Missing required fields in webhook payload:', payload);
      return NextResponse.json(
        { error: 'Missing required fields: event and eventId are required' },
        { status: 400 }
      );
    }

    // Process webhook event (don't await to avoid timeout - process async)
    processWebhookEvent(payload).catch((error) => {
      console.error(`❌ Error processing webhook event ${payload.event}:`, error);
    });

    // Return success immediately to Pluggy
    return NextResponse.json({
      received: true,
      event: payload.event,
      eventId: payload.eventId,
    });
  } catch (error) {
    console.error('❌ Error in webhook handler:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Process different webhook event types
async function processWebhookEvent(payload: WebhookPayload): Promise<void> {
  try {
    console.log(`🔄 Processing webhook event: ${payload.event} (${payload.eventId})`);
    
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
    console.error(`❌ Error processing webhook event ${payload.event}:`, error);
    throw error;
  }
}

// Handler for item events
async function handleItemEvent(payload: ItemWebhookPayload): Promise<void> {
  const { itemId } = payload;

  if (!itemId) {
    console.error('❌ Missing itemId in webhook payload:', payload);
    return;
  }

  console.log(`📦 Handling item event for itemId: ${itemId}`);

  if (!hasPluggyCredentials()) {
    console.error('❌ Missing Pluggy credentials, cannot sync item data');
    return;
  }

  const pluggyClient = getPluggyClient();

  try {
    // Fetch item data from Pluggy
    const item = await pluggyClient.fetchItem(itemId);
    console.log(`✅ Fetched item ${itemId} from Pluggy`);

    // Update item in database
    const savedItem = await itemsService.upsertItem({
      item_id: item.id,
      connector_id: item.connector?.id?.toString(),
      connector_name: item.connector?.name,
      connector_image_url: item.connector?.imageUrl,
      status: item.status as 'UPDATED' | 'UPDATING' | 'WAITING_USER_INPUT' | 'LOGIN_ERROR' | 'OUTDATED' | 'CREATED' | undefined,
      last_updated_at: item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toISOString() : undefined,
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
      webhook_url: item.webhookUrl ?? undefined,
      consecutive_failed_login_attempts: item.consecutiveFailedLoginAttempts,
    });
    console.log(`✅ Saved item ${itemId} to database`);

    // Sync accounts and transactions
    await syncItemData(itemId);
    console.log(`✅ Completed sync for item ${itemId}`);
  } catch (error) {
    console.error(`❌ Error handling item event for ${itemId}:`, error);
    throw error;
  }
}

// Handler for item deleted
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

// Handler for item status events
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

// Handler for transactions created/updated
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

  if (!hasPluggyCredentials()) {
    console.error('❌ Missing Pluggy credentials');
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

      await transactionsService.upsertMultipleTransactions(transactions);
      console.log(`✅ Synced ${transactions.length} transactions for account ${accountId}`);
    } else {
      console.log(`ℹ️ No transactions found for account ${accountId}`);
    }
  } catch (error) {
    console.error(`❌ Error syncing transactions for account ${accountId}:`, error);
    throw error;
  }
}

// Handler for transactions deleted
async function handleTransactionsDeleted(payload: TransactionsWebhookPayload): Promise<void> {
  const { transactionIds } = payload;

  if (!transactionIds || !Array.isArray(transactionIds)) {
    console.error('❌ Missing or invalid transactionIds in webhook payload:', payload);
    return;
  }

  try {
    await transactionsService.deleteMultipleTransactions(transactionIds);
    console.log(`✅ Deleted ${transactionIds.length} transactions`);
  } catch (error) {
    console.error('❌ Error deleting transactions:', error);
    throw error;
  }
}

// Sync all data for an item
async function syncItemData(itemId: string): Promise<void> {
  if (!hasPluggyCredentials()) {
    return;
  }

  const pluggyClient = getPluggyClient();

  try {
    console.log(`🔄 Starting sync for item ${itemId}`);
    
    // Fetch and save accounts
    const accountsResponse = await pluggyClient.fetchAccounts(itemId);

    if (accountsResponse.results && accountsResponse.results.length > 0) {
      const accounts = accountsResponse.results
        .filter((account: any) => account.id)
        .map((account: any) => {
          // Omit 'id' field - it's auto-generated by the database
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

      // Sync transactions for each account
      for (const account of savedAccounts) {
        try {
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

            await transactionsService.upsertMultipleTransactions(transactions);
            console.log(`✅ Synced ${transactions.length} transactions for account ${account.account_id}`);
          }
        } catch (error) {
          console.error(
            `❌ Error syncing transactions for account ${account.account_id}:`,
            error
          );
        }
      }
    } else {
      console.log(`ℹ️ No accounts found for item ${itemId}`);
    }
  } catch (error) {
    console.error(`❌ Error syncing data for item ${itemId}:`, error);
    throw error;
  }
}

// OPTIONS: Handle CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
