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

  const { data, error } = await supabase
    .from("card_likes")
    .select("photo_cards(share_id, image_url, address, analysis, created_at, deleted_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 삭제된 카드 제외
  let cards = (data ?? [])
    .map((row) => row.photo_cards)
    .filter((c): c is NonNullable<typeof c> => c != null && !("deleted_at" in c && c.deleted_at));

  // 지역 필터
  if (filtersParam) {
    try {
      const filters: { region: string; city: string | null }[] = JSON.parse(filtersParam);
      if (filters.length > 0) {
        cards = cards.filter((c) =>
          filters.some((f) =>
            f.city
              ? c.address?.includes(f.region) && c.address?.includes(f.city)
              : c.address?.startsWith(f.region)
          )
        );
      }
    } catch {
      // JSON 파싱 실패 시 필터 무시
    }
  }

  return NextResponse.json({ cards });
}
