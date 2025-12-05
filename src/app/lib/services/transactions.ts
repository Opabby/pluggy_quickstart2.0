import { TransactionRecord } from "@/app/types/pluggy";
import { getSupabaseAdmin } from "../supabase/client";

export const transactionsService = {

  async upsertTransactions(
    transactions: TransactionRecord[]
  ): Promise<TransactionRecord[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("transactions")
      .upsert(transactions, {
        onConflict: "transaction_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Error upserting transactions:", error);
      throw new Error(`Failed to upsert transactions: ${error.message}`);
    }

    return data || [];
  },

  async getTransactionsByAccountId(
    accountId: string,
    limit = 100,
    offset = 0
  ): Promise<TransactionRecord[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching transactions:", error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return data || [];
  },

};
