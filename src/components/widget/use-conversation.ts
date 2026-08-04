"use client";

import { useEffect, useState } from "react";
import { createWidgetClient } from "@/lib/supabase/widget-client";
import type { Conversation } from "@/lib/supabase/types";

interface ConversationState {
  loading: boolean;
  error: string | null;
  customerId: string | null;
  conversationId: string | null;
}

// Bootstraps an anonymous customer session and resolves (or creates) the
// conversation this widget instance should be talking to. Reused across
// reloads because the Supabase browser client persists the anon session
// in localStorage, so the same customer_id comes back on the next visit.
export function useConversation() {
  const [supabase] = useState(() => createWidgetClient());
  const [state, setState] = useState<ConversationState>({
    loading: true,
    error: null,
    customerId: null,
    conversationId: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // getUser() (not getSession()) so a locally-cached JWT for a user that
      // no longer exists server-side is caught here and re-authenticated,
      // instead of surfacing later as an opaque FK-violation on insert.
      const { data: userData } = await supabase.auth.getUser();
      let userId = userData.user?.id ?? null;

      if (!userId) {
        const { data: anonData, error: anonError } =
          await supabase.auth.signInAnonymously();
        if (anonError) {
          if (!cancelled) {
            setState({
              loading: false,
              error: anonError.message,
              customerId: null,
              conversationId: null,
            });
          }
          return;
        }
        userId = anonData.user?.id ?? null;
      }

      if (!userId) return;

      const { data: existing, error: existingError } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", userId)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<Pick<Conversation, "id">>();

      if (existingError) {
        if (!cancelled) {
          setState({
            loading: false,
            error: existingError.message,
            customerId: userId,
            conversationId: null,
          });
        }
        return;
      }

      if (existing) {
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            customerId: userId,
            conversationId: existing.id,
          });
        }
        return;
      }

      const { data: created, error: createError } = await supabase
        .from("conversations")
        .insert({ customer_id: userId })
        .select("id")
        .single();

      if (!cancelled) {
        setState({
          loading: false,
          error: createError?.message ?? null,
          customerId: userId,
          conversationId: created?.id ?? null,
        });
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return { supabase, ...state };
}
