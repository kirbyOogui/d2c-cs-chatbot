export type ConversationStatus =
  | "ai_handling"
  | "waiting_operator"
  | "operator_handling"
  | "closed";

export type Category = "在庫" | "配送" | "返品" | "商品" | "その他";

export type SenderType = "customer" | "ai" | "operator";

export interface Conversation {
  id: string;
  customer_id: string;
  status: ConversationStatus;
  assigned_operator_id: string | null;
  category: Category | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  created_at: string;
}

export interface Operator {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Faq {
  id: string;
  category: Category;
  question: string;
  answer: string;
  created_at: string;
}
