import { AccountRecord } from "@/app/types/pluggy";
import { getSupabaseAdmin } from "../client";

export const accountsService = {
  async upsertAccount(accountData: AccountRecord): Promise<AccountRecord> {
    const { data, error } = await getSupabaseAdmin()
      .from("accounts")
      .upsert(accountData, {
        onConflict: "account_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting account:", error);
      throw new Error(`Failed to upsert account: ${error.message}`);
    }

    return data;
  },

  async upsertMultipleAccounts(
    accounts: AccountRecord[]
  ): Promise<AccountRecord[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("accounts")
      .upsert(accounts, {
        onConflict: "account_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Error upserting accounts:", error);
      throw new Error(`Failed to upsert accounts: ${error.message}`);
    }

    return data || [];
  },

  async getAccountsByItemId(itemId: string): Promise<AccountRecord[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("accounts")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching accounts:", error);
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    return data || [];
  },
};