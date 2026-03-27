import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUserId = params.id;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "18", 10) || 18, 1), 50);

  // profiles 테이블에서 display_name, avatar_url 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", targetUserId)
    .single();

  const isMe = user.id === targetUserId;

  // 팔로우 여부 확인
  let isFollowing = false;
  if (!isMe) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();
    isFollowing = !!followRow;
  }

  // 해당 유저의 photo_cards 조회 (삭제된 카드 제외 + 공개범위 필터)
  let query = supabase
    .from("photo_cards")
    .select("share_id, image_url, address, analysis, created_at, view_count, visibility, comment_count:comments(count)")
    .eq("user_id", targetUserId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (!isMe) {
    if (isFollowing) {
      query = query.in("visibility", ["public", "followers"]);
    } else {
      query = query.eq("visibility", "public");
    }
  }

  const { data: cards, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // comment_count 정규화
  const allRows = cards ?? [];
  const hasNextPage = allRows.length > limit;
  const pageRows = hasNextPage ? allRows.slice(0, limit) : allRows;

  const normalizedCards = pageRows.map((card) => {
    const raw = card.comment_count;
    const count = Array.isArray(raw) && raw.length > 0 ? (raw[0] as { count: number }).count : 0;
    return { ...card, comment_count: count };
  });

  const nextCursor = hasNextPage ? pageRows[pageRows.length - 1].created_at : null;

  return NextResponse.json({
    profile: {
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
    cards: normalizedCards,
    nextCursor,
  });
}
