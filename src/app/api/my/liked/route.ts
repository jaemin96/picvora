import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filtersParam = request.nextUrl.searchParams.get("filters");
  const cursor = request.nextUrl.searchParams.get("cursor");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "18", 10) || 18, 1), 50);

  // card_likes 기준 cursor 페이지네이션: created_at DESC
  let query = supabase
    .from("card_likes")
    .select("created_at, photo_cards(share_id, image_url, address, analysis, created_at, deleted_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 삭제된 카드 제외
  let rows = (data ?? []).filter(
    (row) => row.photo_cards != null && !("deleted_at" in row.photo_cards && row.photo_cards.deleted_at)
  );

  // 지역 필터
  if (filtersParam) {
    try {
      const filters: { region: string; city: string | null }[] = JSON.parse(filtersParam);
      if (filters.length > 0) {
        rows = rows.filter((row) => {
          const c = row.photo_cards as { address?: string | null } | null;
          if (!c) return false;
          return filters.some((f) =>
            f.city
              ? c.address?.includes(f.region) && c.address?.includes(f.city)
              : c.address?.startsWith(f.region)
          );
        });
      }
    } catch {
      // JSON 파싱 실패 시 필터 무시
    }
  }

  const hasNextPage = rows.length > limit;
  const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
  const cards = pageRows.map((row) => row.photo_cards);
  const nextCursor = hasNextPage ? pageRows[pageRows.length - 1].created_at : null;

  return NextResponse.json({ cards, nextCursor });
}
