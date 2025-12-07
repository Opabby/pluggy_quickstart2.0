import { getPluggyClient } from "../../pluggy/client";
import { ItemWebhookPayload } from "@/app/types/pluggy";
import { itemsService } from "../items";
import { syncItemData } from "../sync.service";

export async function handleItemEvent(payload: ItemWebhookPayload): Promise<void> {
  console.log(`📦 handleItemEvent called with payload:`, JSON.stringify(payload, null, 2));
  
  const itemId = payload.itemId || (payload as any).id || (payload as any).item_id;

  if (!itemId) {
    console.error('❌ Missing itemId in webhook payload:', {
      payload: JSON.stringify(payload, null, 2),
      keys: Object.keys(payload),
    });
    return;
  }
  
  console.log(`✅ Extracted itemId: ${itemId}`);
  console.log(`📦 Handling item event for itemId: ${itemId}`);

  const pluggyClient = getPluggyClient();

  try {
    console.log(`🔍 Fetching item ${itemId} from Pluggy API...`);
    const item = await pluggyClient.fetchItem(itemId);
    console.log(`✅ Fetched item ${itemId} from Pluggy:`, {
      id: item.id,
      status: item.status,
      connectorId: item.connector?.id,
    });

    // Is this a mapper???
    console.log(`💾 Saving item ${itemId} to database...`);
    const itemData = {
      item_id: item.id,
      connector_id: item.connector?.id?.toString(),
      connector_name: item.connector?.name,
      connector_image_url: item.connector?.imageUrl,
      status: item.status as 'UPDATED' | 'UPDATING' | 'WAITING_USER_INPUT' | 'LOGIN_ERROR' | 'OUTDATED' | 'CREATED' | undefined,
      last_updated_at: item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toISOString() : undefined,
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
      webhook_url: item.webhookUrl ?? undefined,
      consecutive_failed_login_attempts: item.consecutiveFailedLoginAttempts,
    };
    console.log(`📝 Item data to save:`, JSON.stringify(itemData, null, 2));
    
    console.log(`🔄 Calling itemsService.upsertItem...`);
    let savedItem;
    try {
      savedItem = await itemsService.upsertItem(itemData);
      console.log(`✅ itemsService.upsertItem completed successfully`);
      console.log(`✅ Saved item ${itemId} to database:`, {
        item_id: savedItem?.item_id,
        status: savedItem?.status,
      });
    } catch (dbError) {
      console.error(`❌ Database error in upsertItem:`, {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        name: dbError instanceof Error ? dbError.name : undefined,
        itemId,
        itemData: JSON.stringify(itemData, null, 2),
      });
      throw dbError;
    }

    console.log(`🔄 Starting sync for item ${itemId}...`);
    await syncItemData(itemId);
    console.log(`✅ Completed sync for item ${itemId}`);
  } catch (error) {
    console.error(`❌ Error handling item event for ${itemId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      itemId,
    });
    throw error;
  }
}

export async function handleItemStatusEvent(payload: ItemWebhookPayload): Promise<void> {
  const { itemId } = payload;

  if (!itemId) {
    console.error('❌ Missing itemId in webhook payload:', payload);
    return;
  }

  try {
    const item = await itemsService.getItem(itemId);

    if (item) {
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

export async function handleItemDeleted(payload: ItemWebhookPayload): Promise<void> {
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