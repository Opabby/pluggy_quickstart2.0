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
    
    // Check environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log(`[itemsService] Environment check:`, {
      hasSupabaseUrl: hasUrl,
      hasServiceRoleKey: hasKey,
      supabaseUrl: hasUrl ? `${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...` : 'MISSING',
    });
    
    if (!hasUrl || !hasKey) {
      throw new Error(`Missing Supabase credentials: URL=${hasUrl}, Key=${hasKey}`);
    }
    
    const supabase = getSupabaseAdmin();
    console.log(`[itemsService] Supabase client created`);
    
    console.log(`[itemsService] Executing Supabase upsert...`);
    const startTime = Date.now();
    
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('pluggy_items')
          .upsert(item, { onConflict: 'item_id' })
          .select()
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase upsert timeout after 15 seconds')), 15000)
        )
      ]) as { data: any; error: any };
      
      const duration = Date.now() - startTime;
      console.log(`[itemsService] Supabase upsert completed in ${duration}ms:`, {
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
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[itemsService] Exception in upsertItem after ${duration}ms:`, {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        item_id: item.item_id,
      });
      throw err;
    }
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