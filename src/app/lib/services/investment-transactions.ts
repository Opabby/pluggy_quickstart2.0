import { getSupabaseAdmin } from '../supabase/client';
import type { InvestmentTransactionRecord } from '@/app/types/pluggy';

export const investmentTransactionsService = {

  async upsertTransactions(
    transactions: InvestmentTransactionRecord[]
  ): Promise<InvestmentTransactionRecord[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('investment_transactions')
      .upsert(transactions, {
        onConflict: 'transaction_id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('Error upserting investment transactions:', error);
      throw new Error(`Failed to upsert investment transactions: ${error.message}`);
    }

    return data || [];
  },

  async getTransactionsByInvestmentId(
    investmentId: string,
    limit?: number,
    offset?: number
  ): Promise<InvestmentTransactionRecord[]> {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('investment_transactions')
      .select('*')
      .eq('investment_id', investmentId)
      .order('date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching investment transactions:', error);
      throw new Error(`Failed to fetch investment transactions: ${error.message}`);
    }

    return data || [];
  },
};
