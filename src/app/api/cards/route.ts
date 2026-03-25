import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mine = request.nextUrl.searchParams.get("mine") === "true";
  const filtersParam = request.nextUrl.searchParams.get("filters"); // JSON: [{region, city?}]

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("photo_cards")
    .select("share_id, image_url, address, analysis, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (mine) {
    query = query.eq("user_id", user.id);
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

  return NextResponse.json({ cards: data ?? [], userId: user.id });
}
