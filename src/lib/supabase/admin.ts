import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS entirely -- server-only code (API routes,
// the AI response pipeline) uses this, never imported into client components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      db: { schema: "cs_chat" },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
