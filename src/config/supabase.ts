import { SupabaseClient } from "@supabase/supabase-js";
import { AppConfig } from ".";

export const supabaseClient = new SupabaseClient(
  AppConfig.supabaseUrl,
  AppConfig.supabaseServiceKey
);
