import { redirect } from "next/navigation";
import { createClient } from "./server";

// Server-side gate for every /admin page. Confirms there's a logged-in
// Supabase Auth user AND that they're listed in cs_chat.operators -- being
// authenticated alone isn't enough, since any anonymous customer session
// also passes auth.uid() checks under the `authenticated` role.
export async function requireOperator() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: operator } = await supabase
    .from("operators")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!operator) {
    redirect("/admin/login?error=not_operator");
  }

  return { supabase, operator };
}
