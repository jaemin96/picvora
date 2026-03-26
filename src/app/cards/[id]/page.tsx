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

  // 조회수 — DB 현재값 그대로 표시, 실제 increment는 클라이언트가 /api/view 호출
  const newCount = data.view_count ?? 0;

  // 댓글 수
  const { count: commentCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("card_id", params.id);

  // 작성자 프로필
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", data.user_id)
    .single();

  const isOwner = user?.id === data.user_id;

  return (
    <CardDetailClient
      card={data}
      viewCount={newCount}
      commentCount={commentCount ?? 0}
      isOwner={isOwner}
      currentUserId={user?.id ?? null}
      authorProfile={authorProfile ?? null}
    />
  );
}
