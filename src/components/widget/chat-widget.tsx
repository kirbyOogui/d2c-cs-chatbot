"use client";

import { useState, type FormEvent } from "react";
import { useConversation } from "./use-conversation";
import { useMessages } from "./use-messages";

// Placeholder brand color -- swap to the client's actual brand color via
// this one CSS variable once we have it (see AGENTS.md / hearing notes).
const BRAND_COLOR = "#16a34a";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { supabase, conversationId, loading: bootLoading, error } =
    useConversation();
  const { messages, loading: messagesLoading } = useMessages(
    supabase,
    conversationId
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !conversationId || sending) return;

    setSending(true);
    setInput("");
    const { error: sendError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "customer",
      content,
    });
    if (sendError) {
      // put the draft back so the customer doesn't lose what they typed
      setInput(content);
    } else {
      // fire-and-forget: the AI's reply arrives via the Realtime subscription,
      // not this response, so the widget doesn't need to wait on it
      fetch("/api/ai-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      }).catch(() => {
        // network hiccup -- the customer can just send another message
      });
    }
    setSending(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="チャットを開く"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-7 w-7"
        >
          <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4.7 3.76A.5.5 0 0 1 2.5 20.4V6a2 2 0 0 1 2-2Z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
      <header
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        <span className="font-semibold">カスタマーサポート</span>
        <button
          onClick={() => setOpen(false)}
          aria-label="チャットを閉じる"
          className="rounded-full p-1 hover:bg-white/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            接続に失敗しました。時間をおいて再度お試しください。
          </p>
        )}
        {(bootLoading || messagesLoading) && !error && (
          <p className="text-center text-sm text-zinc-400">読み込み中...</p>
        )}
        {!bootLoading && !messagesLoading && messages.length === 0 && (
          <p className="text-center text-sm text-zinc-400">
            ご質問をお気軽にどうぞ。担当AIが対応します。
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender_type === "customer" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                message.sender_type === "customer"
                  ? "text-white"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
              style={
                message.sender_type === "customer"
                  ? { backgroundColor: BRAND_COLOR }
                  : undefined
              }
            >
              {message.sender_type !== "customer" && (
                <div className="mb-0.5 text-[11px] font-medium opacity-60">
                  {message.sender_type === "ai" ? "AIアシスタント" : "サポート担当"}
                </div>
              )}
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          disabled={bootLoading || !!error}
          className="flex-1 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={bootLoading || !!error || !input.trim() || sending}
          aria-label="送信"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M3 12l18-9-4 9 4 9-18-9Zm2.6 0L18 6.5 13.4 12 18 17.5 5.6 12Z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
