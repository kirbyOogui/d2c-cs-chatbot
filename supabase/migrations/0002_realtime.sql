-- Postgres Changes only fires for tables added to the supabase_realtime
-- publication -- this is separate from RLS and from "Exposed schemas/tables"
-- in the Data API settings. Missing this step means inserts succeed (201)
-- but no client ever receives the change over the Realtime channel.

ALTER PUBLICATION supabase_realtime ADD TABLE cs_chat.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE cs_chat.conversations;
