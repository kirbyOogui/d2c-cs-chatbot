"use client";

import { useEffect, useState } from "react";
import { createWidgetClient } from "@/lib/supabase/widget-client";
import type { Conversation, ConversationStatus } from "@/lib/supabase/types";

interface ConversationState {
  loading: boolean;
  error: string | null;
  customerId: string | null;
  conversationId: string | null;
  conversationStatus: ConversationStatus | null;
}

const INITIAL_STATE: ConversationState = {
  loading: true,
  error: null,
  customerId: null,
  conversationId: null,
  conversationStatus: null,
};

// Bootstraps an anonymous customer session and resolves (or creates) the
// conversation this widget instance should be talking to. Reused across
// reloads because the Supabase browser client persists the anon session
// in localStorage, so the same customer_id comes back on the next visit.
export function useConversation() {
  const [supabase] = useState(() => createWidgetClient());
  const [state, setState] = useState<ConversationState>(INITIAL_STATE);

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
            setState({ ...INITIAL_STATE, loading: false, error: anonError.message });
          }
          return;
        }
        userId = anonData.user?.id ?? null;
      }

      if (!userId) return;

      const { data: existing, error: existingError } = await supabase
        .from("conversations")
        .select("id, status")
        .eq("customer_id", userId)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<Pick<Conversation, "id" | "status">>();

      if (existingError) {
        if (!cancelled) {
          setState({
            ...INITIAL_STATE,
            loading: false,
            error: existingError.message,
            customerId: userId,
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
            conversationStatus: existing.status,
          });
        }
        return;
      }

      const { data: created, error: createError } = await supabase
        .from("conversations")
        .insert({ customer_id: userId })
        .select("id, status")
        .single();

      if (!cancelled) {
        setState({
          loading: false,
          error: createError?.message ?? null,
          customerId: userId,
          conversationId: created?.id ?? null,
          conversationStatus: created?.status ?? null,
        });
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Keep conversationStatus live -- escalation can happen mid-session (the
  // AI's own first reply can flip ai_handling -> waiting_operator), and an
  // operator can later pick it up or close it out from the admin console.
  useEffect(() => {
    if (!state.conversationId) return;

    const channel = supabase
      .channel(`conv-status-${state.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "cs_chat",
          table: "conversations",
          filter: `id=eq.${state.conversationId}`,
        },
        (payload) => {
          const next = payload.new as Conversation;
          setState((current) => ({ ...current, conversationStatus: next.status }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, state.conversationId]);

  return { supabase, ...state };
}
