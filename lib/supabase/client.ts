import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Environment variable ${name} is required for Supabase.`);
  }
  return value;
}

const supabaseUrl = requireEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL
);
const supabaseAnonKey = requireEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let browserClient: SupabaseClient | null = null;

export function createBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return browserClient;
}

export function createSupabaseBrowserClient(): SupabaseClient {
  return createBrowserClient();
}
