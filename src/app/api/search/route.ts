import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ cards: [], users: [] });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 팔로우 목록 조회 (공개범위 필터 위해)
  const { data: followingRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = (followingRows ?? []).map((r) => r.following_id);

  // 공개범위 필터 조건
  const visibilityFilter =
    followingIds.length > 0
      ? `visibility.eq.public,and(visibility.eq.followers,user_id.in.(${followingIds.join(",")})),user_id.eq.${user.id}`
      : `visibility.eq.public,user_id.eq.${user.id}`;

  // 주소 검색 (DB 쿼리)
  const { data: addressRows } = await supabase
    .from("photo_cards")
    .select("share_id, image_url, address, analysis, created_at, view_count, user_id")
    .is("deleted_at", null)
    .or(visibilityFilter)
    .ilike("address", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  // 태그/shortcutMessage 매칭: 최근 카드를 클라이언트에서 필터
  const { data: allRows } = await supabase
    .from("photo_cards")
    .select("share_id, image_url, address, analysis, created_at, view_count, user_id")
    .is("deleted_at", null)
    .or(visibilityFilter)
    .order("created_at", { ascending: false })
    .limit(200);

  const lq = q.toLowerCase();
  const textMatched = (allRows ?? []).filter((card) => {
    const tags: { label: string }[] = card.analysis?.tags ?? [];
    const hasTag = tags.some((t) => t.label.toLowerCase().includes(lq));
    const hasMsg = card.analysis?.shortcutMessage?.toLowerCase().includes(lq);
    return hasTag || hasMsg;
  });

  // 합집합 (중복 제거)
  const seen = new Set<string>();
  const cards = [...(addressRows ?? []), ...textMatched].filter((c) => {
    if (seen.has(c.share_id)) return false;
    seen.add(c.share_id);
    return true;
  }).slice(0, 20);

  // 사용자 검색: profiles 테이블 display_name ilike
  const { data: userRows } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .ilike("display_name", `%${q}%`)
    .neq("id", user.id)
    .limit(5);

  return NextResponse.json({ cards, users: userRows ?? [] });
}
