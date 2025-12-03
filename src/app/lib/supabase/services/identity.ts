import { getSupabaseAdmin } from '../client';
import type { IdentityRecord } from '@/app/types/pluggy';

export const identityService = {
  /**
   * Upsert (insert or update) an identity record
   */
  async upsertIdentity(identityData: IdentityRecord): Promise<IdentityRecord> {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('identities')
      .upsert(identityData, {
        onConflict: 'identity_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting identity:', error);
      throw new Error(`Failed to upsert identity: ${error.message}`);
    }

    return data;
  },

  /**
   * Create a new identity record
   */
  async createIdentity(identityData: IdentityRecord): Promise<IdentityRecord> {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('identities')
      .insert([identityData])
      .select()
      .single();

    if (error) {
      console.error('Error creating identity:', error);
      throw new Error(`Failed to create identity: ${error.message}`);
    }

    return data;
  },

  /**
   * Get identity by item_id
   */
  async getIdentityByItemId(itemId: string): Promise<IdentityRecord | null> {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('identities')
      .select('*')
      .eq('item_id', itemId)
      .single();

    if (error) {
      // PGRST116 = no rows returned (not found)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching identity:', error);
      throw new Error(`Failed to fetch identity: ${error.message}`);
    }

    return data;
  },

  /**
   * Get identity by identity_id
   */
  async getIdentityById(identityId: string): Promise<IdentityRecord | null> {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('identities')
      .select('*')
      .eq('identity_id', identityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching identity by ID:', error);
      throw new Error(`Failed to fetch identity: ${error.message}`);
    }

    return data;
  },

  /**
   * Update an existing identity record
   */
  async updateIdentity(
    identityId: string,
    updateData: Partial<IdentityRecord>
  ): Promise<IdentityRecord> {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('identities')
      .update(updateData)
      .eq('identity_id', identityId)
      .select()
      .single();

    if (error) {
      console.error('Error updating identity:', error);
      throw new Error(`Failed to update identity: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete an identity record
   */
  async deleteIdentity(identityId: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('identities')
      .delete()
      .eq('identity_id', identityId);

    if (error) {
      console.error('Error deleting identity:', error);
      throw new Error(`Failed to delete identity: ${error.message}`);
    }
  },

  /**
   * Delete all identities for an item
   */
  async deleteIdentitiesByItemId(itemId: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('identities')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      console.error('Error deleting identities by item ID:', error);
      throw new Error(`Failed to delete identities: ${error.message}`);
    }
  },

  /**
   * Get all identities (with optional filters)
   */
  async getAllIdentities(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<IdentityRecord[]> {
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('identities')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all identities:', error);
      throw new Error(`Failed to fetch identities: ${error.message}`);
    }

    return data || [];
  },
};