"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/components/widget/use-messages";
import type { Conversation } from "@/lib/supabase/types";

const STATUS_LABEL: Record<Conversation["status"], string> = {
  ai_handling: "AI対応中",
  waiting_operator: "人間待ち",
  operator_handling: "対応中",
  closed: "完了",
};

export function ConversationDetail({
  conversation,
  operatorId,
}: {
  conversation: Conversation;
  operatorId: string;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { messages, loading } = useMessages(supabase, conversation.id);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(conversation.status);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");

    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_type: "operator",
      sender_id: operatorId,
      content,
    });

    if (status !== "operator_handling") {
      await supabase
        .from("conversations")
        .update({ status: "operator_handling", assigned_operator_id: operatorId })
        .eq("id", conversation.id);
      setStatus("operator_handling");
    }

    setSending(false);
  }

  async function handleClose() {
    await supabase
      .from("conversations")
      .update({ status: "closed" })
      .eq("id", conversation.id);
    router.push("/admin");
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <button
            onClick={() => router.push("/admin")}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← 一覧へ戻る
          </button>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="font-medium">{STATUS_LABEL[status]}</span>
            {conversation.category && (
              <span className="text-zinc-500">/ {conversation.category}</span>
            )}
          </div>
        </div>
        {status !== "closed" && (
          <button
            onClick={handleClose}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            対応完了にする
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {loading && <p className="text-sm text-zinc-400">読み込み中...</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_type === "customer" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                m.sender_type === "customer"
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : m.sender_type === "ai"
                    ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                    : "bg-black text-white dark:bg-white dark:text-black"
              }`}
            >
              <div className="mb-0.5 text-[11px] font-medium opacity-60">
                {m.sender_type === "customer"
                  ? "顧客"
                  : m.sender_type === "ai"
                    ? "AIアシスタント"
                    : "オペレーター"}
              </div>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="返信を入力..."
          disabled={status === "closed"}
          className="flex-1 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending || status === "closed"}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          送信
        </button>
      </form>
    </div>
  );
}
