import { getPluggyClient } from "../../pluggy/client";
import { ItemWebhookPayload, PluggyItemRecord } from "@/app/types/pluggy";
import { itemsService } from "../items";
import { syncItemData } from "../item-sync.service";
import { mapItemFromPluggyToDb } from "../mappers/item.mapper";

export async function handleItemEvent(payload: ItemWebhookPayload): Promise<void> {
  const itemId = payload.itemId || payload.id;

  if (!itemId) {
    return;
  }

  const pluggyClient = getPluggyClient();

  try {
    const item = await pluggyClient.fetchItem(itemId);
    const itemData = mapItemFromPluggyToDb(item);

    if (payload.clientUserId && !itemData.user_id) {
      itemData.user_id = payload.clientUserId;
    }
    
    await itemsService.upsertItem(itemData);
    await syncItemData(itemId);
  } catch (error) {
    throw error;
  }
}

export async function handleItemDeleted(payload: ItemWebhookPayload): Promise<void> {
  const { itemId } = payload;

  if (!itemId) {
    return;
  }

  try {
    await itemsService.deleteItem(itemId);
  } catch (error) {
    throw error;
  }
}