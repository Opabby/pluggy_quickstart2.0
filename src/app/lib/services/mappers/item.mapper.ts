import { Item } from "pluggy-sdk";
import { PluggyItemRecord } from "../../../types/pluggy";

export function mapItemFromPluggyToDb(item: Item): PluggyItemRecord {
  const connector = item.connector;
  
  return {
    item_id: item.id,
    user_id: item.clientUserId || undefined,
    connector_id: connector.id.toString(),
    connector_name: connector.name,
    connector_image_url: connector.imageUrl,
    status: item.status as PluggyItemRecord['status'],
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString(),
    last_updated_at: item.lastUpdatedAt ? item.lastUpdatedAt.toISOString() : null,
    webhook_url: item.webhookUrl,
    parameters: item.parameter,
    institution_name: connector.name,
    institution_url: connector.institutionUrl,
    primary_color: connector.primaryColor,
    secondary_color: undefined,
  };
}