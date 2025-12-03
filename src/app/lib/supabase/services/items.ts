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
    
    // Retry logic with exponential backoff
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[itemsService] Attempt ${attempt}/${maxRetries}...`);
        
        const upsertPromise = supabase
          .from('pluggy_items')
          .upsert(item, { onConflict: 'item_id' })
          .select()
          .single();
        
        // Add explicit timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Supabase upsert timeout after 10 seconds')), 10000);
        });
        
        const { data, error } = await Promise.race([upsertPromise, timeoutPromise]) as { data: any; error: any };
      
        const duration = Date.now() - startTime;
        console.log(`[itemsService] Supabase upsert completed in ${duration}ms (attempt ${attempt}):`, {
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
          console.error(`[itemsService] Supabase error on attempt ${attempt}:`, error);
          lastError = error;
          
          // Retry on network errors or timeout
          if (attempt < maxRetries && (
            error.message?.includes('fetch failed') ||
            error.message?.includes('timeout') ||
            error.message?.includes('ECONNRESET') ||
            error.message?.includes('network')
          )) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
            console.log(`[itemsService] Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw error;
        }
        
        console.log(`[itemsService] Returning saved item:`, {
          item_id: data?.item_id,
          status: data?.status,
        });
        
        return data;
      } catch (err) {
        const duration = Date.now() - startTime;
        lastError = err;
        
        console.error(`[itemsService] Exception in upsertItem after ${duration}ms (attempt ${attempt}):`, {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          item_id: item.item_id,
        });
        
        // Retry on network errors
        if (attempt < maxRetries && (
          (err instanceof Error && (
            err.message?.includes('fetch failed') ||
            err.message?.includes('timeout') ||
            err.message?.includes('ECONNRESET') ||
            err.message?.includes('network')
          ))
        )) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[itemsService] Retrying after ${delay}ms due to network error...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw err;
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('All retry attempts failed');
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