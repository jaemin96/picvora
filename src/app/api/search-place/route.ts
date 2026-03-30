import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim().length === 0) {
    return NextResponse.json({ places: [] });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ places: [] });
    }

    const data = await res.json();
    const places = (data.documents ?? []).map(
      (doc: { place_name: string; address_name: string; road_address_name: string; y: string; x: string; category_group_name: string }) => ({
        name: doc.place_name,
        address: doc.road_address_name || doc.address_name,
        latitude: parseFloat(doc.y),
        longitude: parseFloat(doc.x),
        category: doc.category_group_name || "",
      })
    );

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [] });
  }
}
