"use client";

import { useEffect, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { createWidgetClient } from "@/lib/supabase/widget-client";
import type { Message } from "@/lib/supabase/types";

// Loads existing history once, then stays live via Realtime. Splitting these
// two steps matters: subscribing alone only ever sees messages sent *after*
// the widget mounted, so a returning customer would see an empty thread.
// Shared by the widget (widget-client, localStorage-backed) and the operator
// console (client.ts, cookie-backed) -- accepts either.
export function useMessages(
  supabase: ReturnType<typeof createClient> | ReturnType<typeof createWidgetClient>,
  conversationId: string | null
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;
    setLoading(true);

    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setMessages(data ?? []);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "cs_chat",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((current) => {
            const next = payload.new as Message;
            if (current.some((m) => m.id === next.id)) return current;
            return [...current, next];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  return { messages, loading };
}
