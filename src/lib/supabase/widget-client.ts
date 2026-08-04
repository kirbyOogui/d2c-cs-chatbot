import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Customer-facing widget client. Deliberately NOT the cookie-based
// lib/supabase/client.ts used by the operator console: when the widget is
// embedded via <iframe> on an external site (see public/widget.js), it runs
// in a cross-origin/third-party context, and browsers silently block that
// iframe's cookie writes there. signInAnonymously() still succeeds against
// the server, but the session never persists client-side, so every
// following request goes out unauthenticated and gets rejected by RLS.
// localStorage is scoped to the iframe's own origin and isn't subject to
// that same third-party restriction, so we use the plain supabase-js client
// (localStorage-backed) here instead of the ssr package's cookie storage.
export function createWidgetClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: "cs_chat" } }
  );
}
