import { supabaseAdmin } from '../client';
import type { PluggyItemRecord } from '@/types/pluggy';

export const itemsService = {
  async getItems(userId?: string): Promise<PluggyItemRecord[]> {
    let query = supabaseAdmin.from('items').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },

  async getItem(itemId: string): Promise<PluggyItemRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('item_id', itemId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async upsertItem(item: PluggyItemRecord): Promise<PluggyItemRecord> {
    const { data, error } = await supabaseAdmin
      .from('items')
      .upsert(item, { onConflict: 'item_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('items')
      .delete()
      .eq('item_id', itemId);
    
    if (error) throw error;
  }
};