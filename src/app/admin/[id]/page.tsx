import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/supabase/require-operator";
import { ConversationDetail } from "@/components/admin/conversation-detail";

export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, operator } = await requireOperator();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (!conversation) {
    notFound();
  }

  return <ConversationDetail conversation={conversation} operatorId={operator.id} />;
}
