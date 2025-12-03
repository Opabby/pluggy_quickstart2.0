import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient, hasPluggyCredentials } from '@/app/lib/pluggy/client';
import { itemsService } from '@/app/lib/supabase/services/items';
import { accountsService } from '@/app/lib/supabase/services/accounts';
import { transactionsService } from '@/app/lib/supabase/services/transactions';
import type { WebhookPayload, AccountRecord } from '@/app/types/pluggy';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST: Handle webhook events
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WebhookPayload;

    if (!payload.event || !payload.eventId) {
      return NextResponse.json(
        { error: 'Missing required fields: event and eventId are required' },
        { status: 400 }
      );
    }

    console.log(`Received webhook event: ${payload.event} (${payload.eventId})`);

    // Process webhook event
    await processWebhookEvent(payload);

    return NextResponse.json({
      received: true,
      event: payload.event,
      eventId: payload.eventId,
    });
  } catch (error) {
    console.error('Error in webhook handler:', error);
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
    switch (payload.event) {
      case 'item/created':
      case 'item/updated':
      case 'item/login_succeeded':
        await handleItemEvent(payload);
        break;

      case 'item/deleted':
        await handleItemDeleted(payload);
        break;

      case 'item/error':
      case 'item/waiting_user_input':
        await handleItemStatusEvent(payload);
        break;

      case 'transactions/created':
      case 'transactions/updated':
        await handleTransactionsCreated(payload);
        break;

      case 'transactions/deleted':
        await handleTransactionsDeleted(payload);
        break;

      case 'connector/status_updated':
        console.log('Connector status updated:', payload);
        break;

      default:
        console.warn(`Unknown webhook event type: ${payload.event}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${payload.event}:`, error);
    throw error;
  }
}

// Handler for item events
async function handleItemEvent(payload: any): Promise<void> {
  const { itemId } = payload;

  if (!itemId) {
    console.error('Missing itemId in webhook payload');
    return;
  }

  if (!hasPluggyCredentials()) {
    console.error('Missing Pluggy credentials, cannot sync item data');
    return;
  }

  const pluggyClient = getPluggyClient();

  try {
    // Fetch item data from Pluggy
    const item = await pluggyClient.fetchItem(itemId);

    // Update item in database
    await itemsService.upsertItem({
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

    // Sync accounts and transactions
    await syncItemData(itemId);
  } catch (error) {
    console.error(`Error handling item event for ${itemId}:`, error);
  }
}

// Handler for item deleted
async function handleItemDeleted(payload: any): Promise<void> {
  const { itemId } = payload;

  if (!itemId) {
    console.error('Missing itemId in webhook payload');
    return;
  }

  try {
    await itemsService.deleteItem(itemId);
    console.log(`Item ${itemId} deleted from database`);
  } catch (error) {
    console.error(`Error deleting item ${itemId}:`, error);
  }
}

// Handler for item status events
async function handleItemStatusEvent(payload: any): Promise<void> {
  const { itemId } = payload;

  if (!itemId) {
    console.error('Missing itemId in webhook payload');
    return;
  }

  try {
    const item = await itemsService.getItem(itemId);

    if (item) {
      // Update item status in database
      await itemsService.upsertItem({
        ...item,
        status: payload.data?.status || item.status,
      });
    }
  } catch (error) {
    console.error(`Error handling status event for ${itemId}:`, error);
  }
}

// Handler for transactions created/updated
async function handleTransactionsCreated(payload: any): Promise<void> {
  const { itemId, accountId } = payload;

  if (!itemId || !accountId) {
    console.error('Missing itemId or accountId in webhook payload');
    return;
  }

  if (!hasPluggyCredentials()) {
    console.error('Missing Pluggy credentials');
    return;
  }

  const pluggyClient = getPluggyClient();

  try {
    // Fetch latest transactions from Pluggy
    const transactionsResponse = await pluggyClient.fetchTransactions(accountId);

    if (transactionsResponse.results && transactionsResponse.results.length > 0) {
      const transactions = transactionsResponse.results.map((tx: any) => ({
        item_id: itemId,
        account_id: accountId,
        transaction_id: tx.id,
        description: tx.description,
        description_raw: tx.descriptionRaw,
        amount: tx.amount,
        date: tx.date,
        balance: tx.balance,
        currency_code: tx.currencyCode,
        category: tx.category,
        category_id: tx.categoryId,
        provider_code: tx.providerCode,
        provider_id: tx.providerId,
        status: tx.status,
        type: tx.type,
        operation_type: tx.operationType,
        operation_category: tx.operationCategory,
        payment_data: tx.paymentData,
        credit_card_metadata: tx.creditCardMetadata,
        merchant: tx.merchant,
      }));

      await transactionsService.upsertMultipleTransactions(transactions);
      console.log(`Synced ${transactions.length} transactions for account ${accountId}`);
    }
  } catch (error) {
    console.error(`Error syncing transactions for account ${accountId}:`, error);
  }
}

// Handler for transactions deleted
async function handleTransactionsDeleted(payload: any): Promise<void> {
  const { transactionIds } = payload;

  if (!transactionIds || !Array.isArray(transactionIds)) {
    console.error('Missing or invalid transactionIds in webhook payload');
    return;
  }

  try {
    await transactionsService.deleteMultipleTransactions(transactionIds);
  } catch (error) {
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

      await accountsService.upsertMultipleAccounts(accounts);

      // Sync transactions for each account
      for (const account of accounts) {
        try {
          const transactionsResponse = await pluggyClient.fetchTransactions(
            account.account_id
          );

          if (transactionsResponse.results && transactionsResponse.results.length > 0) {
            const transactions = transactionsResponse.results.map((tx: any) => ({
              item_id: itemId,
              account_id: account.account_id,
              transaction_id: tx.id,
              description: tx.description,
              description_raw: tx.descriptionRaw,
              amount: tx.amount,
              date: tx.date,
              balance: tx.balance,
              currency_code: tx.currencyCode,
              category: tx.category,
              category_id: tx.categoryId,
              provider_code: tx.providerCode,
              provider_id: tx.providerId,
              status: tx.status,
              type: tx.type,
              operation_type: tx.operationType,
              operation_category: tx.operationCategory,
              payment_data: tx.paymentData,
              credit_card_metadata: tx.creditCardMetadata,
              merchant: tx.merchant,
            }));

            await transactionsService.upsertMultipleTransactions(transactions);
          }
        } catch (error) {
          console.error(
            `Error syncing transactions for account ${account.account_id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error syncing data for item ${itemId}:`, error);
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