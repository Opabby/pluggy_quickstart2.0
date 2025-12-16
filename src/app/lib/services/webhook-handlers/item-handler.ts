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
    
    await itemsService.upsertItem(itemData);
    await syncItemData(itemId);
  } catch (error) {
    throw error;
  }
}

export async function handleItemStatusEvent(payload: ItemWebhookPayload): Promise<void> {
  const { itemId, event } = payload;

  if (!itemId) {
    return;
  }

  try {
    const item = await itemsService.getItem(itemId);

    if (item) {
      let status: PluggyItemRecord['status'] | undefined = item.status;
      
      if (event === 'item/error') {
        status = 'LOGIN_ERROR';
      } else if (event === 'item/waiting_user_input') {
        status = 'WAITING_USER_INPUT';
      }

      await itemsService.upsertItem({
        ...item,
        status: status || item.status,
      });
    }
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