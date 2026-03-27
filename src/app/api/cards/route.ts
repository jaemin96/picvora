import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mine = request.nextUrl.searchParams.get("mine") === "true";
  const feed = request.nextUrl.searchParams.get("feed") ?? "all"; // "all" | "following"
  const filtersParam = request.nextUrl.searchParams.get("filters"); // JSON: [{region, city?}]
  const cursor = request.nextUrl.searchParams.get("cursor"); // created_at ISO string
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "18", 10) || 18, 1), 50);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includeDeleted = mine && request.nextUrl.searchParams.get("include_deleted") === "true";

  let query = supabase
    .from("photo_cards")
    .select("share_id, image_url, address, analysis, created_at, user_id, view_count, deleted_at, visibility, comment_count:comments(count)")
    .order("created_at", { ascending: false })
    .limit(limit + 1); // +1 to check if there's a next page

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (mine) {
    query = query.eq("user_id", user.id);
  }

  // 마이페이지에서 include_deleted=true가 아니면 삭제된 카드 제외
  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  // 본인 카드가 아닌 경우 공개범위 필터링
  if (!mine) {
    // 나를 팔로우하는 사람이 아닌, 내가 팔로우하는 사람의 followers 공개 게시물도 볼 수 있어야 함
    // public 카드 + 내가 팔로우하는 사용자의 followers 카드
    const { data: followingRows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const followingIds = (followingRows ?? []).map((r) => r.following_id);

    if (feed === "following") {
      // 팔로잉 피드: 팔로잉한 사람들의 카드만
      if (followingIds.length === 0) {
        return NextResponse.json({ cards: [], userId: user.id, empty: "no_following" });
      }
      query = query.in("user_id", followingIds).or(
        `visibility.eq.public,and(visibility.eq.followers,user_id.in.(${followingIds.join(",")}))`
      );
    } else {
      // visibility 필터: public이거나, 본인 카드이거나, followers이면서 내가 팔로우 중인 사용자
      if (followingIds.length > 0) {
        query = query.or(
          `visibility.eq.public,and(visibility.eq.followers,user_id.in.(${followingIds.join(",")})),user_id.eq.${user.id}`
        );
      } else {
        query = query.or(`visibility.eq.public,user_id.eq.${user.id}`);
      }
    }
  }

  // 다중 지역 필터링
  if (filtersParam) {
    try {
      const filters: { region: string; city: string | null }[] = JSON.parse(filtersParam);
      if (filters.length > 0) {
        // OR 조건: 각 필터에 해당하는 주소 패턴 생성
        const patterns = filters.map((f) =>
          f.city
            ? `address.ilike.%${f.region}%${f.city}%`
            : `address.ilike.${f.region}%`
        );
        query = query.or(patterns.join(","));
      }
    } catch {
      // JSON 파싱 실패 시 필터 무시
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // comment_count 집계값 정규화: [{count: n}] → n
  const allRows = data ?? [];
  const hasNextPage = allRows.length > limit;
  const pageRows = hasNextPage ? allRows.slice(0, limit) : allRows;

  // 카드에 포함된 user_id 목록으로 profiles 일괄 조회
  const userIds = [...new Set(pageRows.map((c) => c.user_id).filter(Boolean))];
  const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap[p.id] = { display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null };
    }
  }

  const cards = pageRows.map((card) => {
    const raw = card.comment_count;
    const count = Array.isArray(raw) && raw.length > 0 ? (raw[0] as { count: number }).count : 0;
    const profile = profileMap[card.user_id] ?? { display_name: null, avatar_url: null };
    return { ...card, comment_count: count, ...profile };
  });

  const nextCursor = hasNextPage ? pageRows[pageRows.length - 1].created_at : null;

  return NextResponse.json({ cards, userId: user.id, nextCursor });
}
