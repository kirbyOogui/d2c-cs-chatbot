"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/lib/supabase/types";

const STATUS_LABEL: Record<Conversation["status"], string> = {
  ai_handling: "AI対応中",
  waiting_operator: "人間待ち",
  operator_handling: "対応中",
  closed: "完了",
};

const STATUS_COLOR: Record<Conversation["status"], string> = {
  ai_handling: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  waiting_operator: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  operator_handling: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  closed: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600",
};

export function ConversationList({
  initialConversations,
}: {
  initialConversations: Conversation[];
}) {
  const [supabase] = useState(() => createClient());
  const [conversations, setConversations] = useState(initialConversations);

  useEffect(() => {
    const channel = supabase
      .channel("admin-conversations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "cs_chat", table: "conversations" },
        (payload) => {
          setConversations((current) => [payload.new as Conversation, ...current]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "cs_chat", table: "conversations" },
        (payload) => {
          const updated = payload.new as Conversation;
          setConversations((current) => {
            const withoutUpdated = current.filter((c) => c.id !== updated.id);
            return [updated, ...withoutUpdated].sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (conversations.length === 0) {
    return <p className="p-6 text-sm text-zinc-400">対応中の会話はありません。</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/admin/${c.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[c.status]}`}
              >
                {STATUS_LABEL[c.status]}
              </span>
              {c.category && (
                <span className="text-sm text-zinc-500">{c.category}</span>
              )}
            </div>
            <span className="text-xs text-zinc-400">
              {new Date(c.updated_at).toLocaleString("ja-JP")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
