import { createBrowserClient } from "@supabase/ssr";

// Browser-side client, scoped to the cs_chat schema by default so every
// `.from(...)` call resolves against cs_chat.* instead of the shared public schema.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: "cs_chat" } }
  );
}
