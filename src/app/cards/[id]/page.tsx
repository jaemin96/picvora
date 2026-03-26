import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardDetailClient } from "./card-detail-client";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("photo_cards")
    .select("*")
    .eq("share_id", params.id)
    .single();

  if (error || !data) notFound();

  // 조회수 증가 (atomic)
  const { data: rpcCount } = await supabase.rpc("increment_view_count", {
    card_share_id: params.id,
  });
  const newCount = rpcCount ?? (data.view_count ?? 0) + 1;

  // 댓글 수
  const { count: commentCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("card_id", params.id);

  const isOwner = user?.id === data.user_id;

  return (
    <CardDetailClient
      card={data}
      viewCount={newCount}
      commentCount={commentCount ?? 0}
      isOwner={isOwner}
      currentUserId={user?.id ?? null}
    />
  );
}
