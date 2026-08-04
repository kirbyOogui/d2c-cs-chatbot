import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category, Message } from "@/lib/supabase/types";

const CATEGORIES: Category[] = ["在庫", "配送", "返品", "商品", "その他"];

const RESPONSE_TOOL: Anthropic.Tool = {
  name: "submit_support_response",
  description:
    "Submit the categorized, drafted response for this customer support message.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: CATEGORIES,
        description: "この問い合わせの分類",
      },
      escalate: {
        type: "boolean",
        description:
          "FAQの範囲を超える判断（返金交渉、個別事情の確認、クレーム対応など）が必要な場合はtrue",
      },
      reply: {
        type: "string",
        description:
          "顧客に今すぐ送るメッセージ。escalateがtrueの場合は、担当者に取り次ぐ旨の短い一言。",
      },
    },
    required: ["category", "escalate", "reply"],
  },
};

const SYSTEM_PROMPT = `あなたはECサイトのカスタマーサポートAIです。以下のFAQナレッジベースの範囲内でのみ日本語で丁寧に回答してください。

- FAQに載っていない、または個別の注文状況・返金交渉・クレームなど人間の判断が必要な内容は、無理に答えず escalate を true にしてください。
- 在庫の具体的な数量などFAQにない実データは断定せず、一般的な目安のみ案内してください。
- 回答は簡潔に、絵文字は使わないでください。`;

export async function POST(request: Request) {
  const { conversationId } = (await request.json()) as {
    conversationId?: string;
  };
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("conversations")
    .select("id, status")
    .eq("id", conversationId)
    .single();

  // Once escalated/closed, the AI stays out of the conversation.
  if (!conversation || conversation.status !== "ai_handling") {
    return NextResponse.json({ skipped: true });
  }

  const [{ data: history }, { data: faqs }] = await Promise.all([
    admin
      .from("messages")
      .select("sender_type, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20),
    admin.from("faqs").select("category, question, answer"),
  ]);

  const faqText = (faqs ?? [])
    .map((f) => `[${f.category}] Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const conversationText = (history ?? [])
    .map((m: Pick<Message, "sender_type" | "content">) => {
      const speaker =
        m.sender_type === "customer" ? "顧客" : m.sender_type === "ai" ? "AI" : "オペレーター";
      return `${speaker}: ${m.content}`;
    })
    .join("\n");

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: { effort: "low" },
    system: `${SYSTEM_PROMPT}\n\n# FAQナレッジベース\n${faqText || "(FAQ未登録)"}`,
    tools: [RESPONSE_TOOL],
    tool_choice: { type: "tool", name: "submit_support_response" },
    messages: [{ role: "user", content: `# 会話履歴\n${conversationText}` }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json({ error: "no structured response from model" }, { status: 502 });
  }

  const { category, escalate, reply } = toolUse.input as {
    category: Category;
    escalate: boolean;
    reply: string;
  };

  await admin
    .from("conversations")
    .update({
      category,
      status: escalate ? "waiting_operator" : "ai_handling",
    })
    .eq("id", conversationId);

  await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "ai",
    content: reply,
  });

  return NextResponse.json({ category, escalate });
}
