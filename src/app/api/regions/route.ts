import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** 한국 주소에서 도/시(region1)와 시/군/구(region2)를 파싱 */
function parseRegions(address: string): { region1: string; region2: string } | null {
  const parts = address.trim().split(/\s+/);
  if (parts.length < 2) return null;
  return { region1: parts[0], region2: parts[1] };
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("photo_cards")
    .select("address")
    .not("address", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 도/시 → 시/군/구 맵 구성
  const regionMap = new Map<string, Set<string>>();

  for (const row of data ?? []) {
    if (!row.address) continue;
    const parsed = parseRegions(row.address);
    if (!parsed) continue;

    if (!regionMap.has(parsed.region1)) {
      regionMap.set(parsed.region1, new Set());
    }
    regionMap.get(parsed.region1)!.add(parsed.region2);
  }

  // 정렬된 구조로 변환
  const regions = Array.from(regionMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([region1, cities]) => ({
      name: region1,
      cities: Array.from(cities).sort((a, b) => a.localeCompare(b, "ko")),
    }));

  return NextResponse.json({ regions });
}
