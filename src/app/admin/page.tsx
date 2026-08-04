import { requireOperator } from "@/lib/supabase/require-operator";
import { ConversationList } from "@/components/admin/conversation-list";
import { LogoutButton } from "@/components/admin/logout-button";

export default async function AdminPage() {
  const { supabase, operator } = await requireOperator();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 className="font-semibold">カスタマーサポート管理画面</h1>
          <p className="text-xs text-zinc-500">{operator.display_name}</p>
        </div>
        <LogoutButton />
      </header>
      <ConversationList initialConversations={conversations ?? []} />
    </div>
  );
}
