-- CS Chatbot MVP: schema, tables, RLS
-- Dedicated schema so this coexists safely with other tools sharing this Supabase project.
-- Do not touch `public` here.

CREATE SCHEMA IF NOT EXISTS cs_chat;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- Tables
-- ============================================================

-- Support operators. One row per auth.users entry that is allowed to act as staff.
-- Rows are added manually (or via a future admin invite flow) -- never self-service.
CREATE TABLE cs_chat.operators (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One conversation per customer chat session.
-- customer_id is the auth.uid() of a Supabase Anonymous Auth session (not a client-supplied
-- text id) so that RLS can actually verify "this is that customer's conversation" instead of
-- trusting a value the browser could set to anything.
CREATE TABLE cs_chat.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'ai_handling'
    CHECK (status IN ('ai_handling', 'waiting_operator', 'operator_handling', 'closed')),
  assigned_operator_id UUID REFERENCES cs_chat.operators(id),
  category TEXT
    CHECK (category IN ('在庫', '配送', '返品', '商品', 'その他')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX conversations_customer_id_idx ON cs_chat.conversations (customer_id);
CREATE INDEX conversations_status_idx ON cs_chat.conversations (status);

CREATE TABLE cs_chat.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES cs_chat.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'operator')),
  sender_id UUID REFERENCES cs_chat.operators(id), -- set only when sender_type = 'operator'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_conversation_id_created_at_idx
  ON cs_chat.messages (conversation_id, created_at);

-- AI's FAQ knowledge base. embedding dimension (1024) matches Voyage AI voyage-3,
-- the embedding provider already used on this shared project (see ragmvp schema) --
-- Claude itself has no embeddings API.
CREATE TABLE cs_chat.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('在庫', '配送', '返品', '商品', 'その他')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embedding extensions.VECTOR(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX faqs_category_idx ON cs_chat.faqs (category);

-- keep conversations.updated_at current whenever a message lands, so the operator
-- console can sort "most recently active" without a separate query
CREATE OR REPLACE FUNCTION cs_chat.touch_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cs_chat.conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = cs_chat;

CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON cs_chat.messages
  FOR EACH ROW EXECUTE FUNCTION cs_chat.touch_conversation();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE cs_chat.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_chat.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_chat.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_chat.faqs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION cs_chat.is_operator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM cs_chat.operators WHERE id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = cs_chat;

-- operators table: an operator can see the roster (needed for assignment UI); nobody else can
CREATE POLICY operators_select_self_or_staff ON cs_chat.operators
  FOR SELECT USING (cs_chat.is_operator());

-- conversations: customers only ever see/create their own; operators see & update everything
CREATE POLICY conversations_customer_select ON cs_chat.conversations
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY conversations_customer_insert ON cs_chat.conversations
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY conversations_operator_select ON cs_chat.conversations
  FOR SELECT USING (cs_chat.is_operator());

CREATE POLICY conversations_operator_update ON cs_chat.conversations
  FOR UPDATE USING (cs_chat.is_operator());

-- messages: customers see/send only within their own conversation;
-- operators see everything and send only as themselves; the 'ai' sender is written
-- server-side with the service role key, which bypasses RLS entirely -- no policy needed for it.
CREATE POLICY messages_customer_select ON cs_chat.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cs_chat.conversations c
      WHERE c.id = conversation_id AND c.customer_id = auth.uid()
    )
  );

CREATE POLICY messages_customer_insert ON cs_chat.messages
  FOR INSERT WITH CHECK (
    sender_type = 'customer'
    AND EXISTS (
      SELECT 1 FROM cs_chat.conversations c
      WHERE c.id = conversation_id AND c.customer_id = auth.uid()
    )
  );

CREATE POLICY messages_operator_select ON cs_chat.messages
  FOR SELECT USING (cs_chat.is_operator());

CREATE POLICY messages_operator_insert ON cs_chat.messages
  FOR INSERT WITH CHECK (
    sender_type = 'operator'
    AND sender_id = auth.uid()
    AND cs_chat.is_operator()
  );

-- faqs: operator-managed knowledge base; the AI reads it server-side via the service
-- role key (bypasses RLS), so no customer/anon policy is needed.
CREATE POLICY faqs_operator_all ON cs_chat.faqs
  FOR ALL USING (cs_chat.is_operator()) WITH CHECK (cs_chat.is_operator());

-- ============================================================
-- Expose schema to PostgREST
-- ============================================================
-- NOTE: creating tables/policies via SQL is not enough on this project -- `cs_chat` must
-- also be added to Dashboard > API Settings > "Exposed schemas" and granted usage/select
-- privileges below, or PostgREST will return "Invalid schema" (same gotcha hit on ragmvp).

GRANT USAGE ON SCHEMA cs_chat TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA cs_chat TO service_role;
GRANT SELECT, INSERT, UPDATE ON cs_chat.conversations TO authenticated;
GRANT SELECT, INSERT ON cs_chat.messages TO authenticated;
GRANT SELECT ON cs_chat.operators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cs_chat.faqs TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA cs_chat TO service_role;
