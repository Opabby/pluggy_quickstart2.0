import { getSupabaseAdmin } from '../client';
import type { PluggyItemRecord } from '@/app/types/pluggy';

export const itemsService = {
  async getItems(userId?: string): Promise<PluggyItemRecord[]> {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('pluggy_items').select('*').order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },

  async getItem(itemId: string): Promise<PluggyItemRecord | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pluggy_items')
      .select('*')
      .eq('item_id', itemId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertItem(item: PluggyItemRecord): Promise<PluggyItemRecord> {
    console.log(`[itemsService] upsertItem called with:`, {
      item_id: item.item_id,
      status: item.status,
    });
    
    const supabase = getSupabaseAdmin();
    
    console.log(`[itemsService] Executing Supabase upsert...`);
    const { data, error } = await supabase
      .from('pluggy_items')
      .upsert(item, { onConflict: 'item_id' })
      .select()
      .single();
    
    console.log(`[itemsService] Supabase upsert completed:`, {
      hasData: !!data,
      hasError: !!error,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      } : null,
    });
    
    if (error) {
      console.error(`[itemsService] Supabase error:`, error);
      throw error;
    }
    
    console.log(`[itemsService] Returning saved item:`, {
      item_id: data?.item_id,
      status: data?.status,
    });
    
    return data;
  },

  async deleteItem(itemId: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('pluggy_items')
      .delete()
      .eq('item_id', itemId);
    
    if (error) throw error;
  }
};