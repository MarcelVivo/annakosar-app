import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseServerClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Supabase URL is missing at runtime");
  }

  return supabaseUrl;
}

export function createSupabaseServerClient(): SupabaseClient {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    throw new Error("Skipped during build");
  }

  if (supabaseServerClient) return supabaseServerClient;

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Supabase service role key is missing at runtime");
  }

  supabaseServerClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseServerClient;
}

export const serverClient = createSupabaseServerClient;
