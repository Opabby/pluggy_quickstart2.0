import type { 
  WebhookPayload, 
  ItemWebhookPayload,
  TransactionsWebhookPayload 
} from '@/app/types/pluggy';
import { WebhookEventPayload } from 'pluggy-sdk';
import { handleItemEvent } from './webhook-handlers/item-handler';
import { handleItemDeleted } from './webhook-handlers/item-handler';
import { handleTransactionsCreated, handleTransactionsDeleted } from './webhook-handlers/transactions-handler';

export async function processWebhookEvent(payload: WebhookPayload): Promise<void> {
  try {
      console.log(`🔄 Processing webhook event: ${payload.event} (${payload.eventId})`);
      console.log(`📋 Full payload:`, JSON.stringify(payload, null, 2));
      
      switch (payload.event) {
        case 'item/created':
        case 'item/updated':
        case 'item/login_succeeded':
        case 'item/error':
        case 'item/waiting_user_input':
          await handleItemEvent(payload as ItemWebhookPayload);
          break;
  
        case 'item/deleted':
          await handleItemDeleted(payload as ItemWebhookPayload);
          break;
  
        case 'transactions/created':
          await handleTransactionsCreated(payload as TransactionsWebhookPayload);
          break;

        // case 'transactions/updated':
        //   await handleTransactionsUpdated (payload as Extract<WebhookEventPayload, { event: 'transactions/updated' }>);
        //   break;
  
        case 'transactions/deleted':
          await handleTransactionsDeleted(payload as Extract<WebhookEventPayload, { event: 'transactions/deleted' }>);
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