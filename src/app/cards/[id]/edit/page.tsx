import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditCardClient } from "./edit-card-client";

export default async function EditCardPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("photo_cards")
    .select("*")
    .eq("share_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) notFound();

  return <EditCardClient card={data} />;
}
