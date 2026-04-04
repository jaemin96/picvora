import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shareId, imageUrl, analysis, visibility: visibilityRaw, exif, address } = body;

    if (!analysis) {
      return NextResponse.json({ error: "분석 데이터가 없습니다." }, { status: 400 });
    }

    const visibility = ["public", "followers", "private"].includes(visibilityRaw) ? visibilityRaw : "public";

    // DB 저장
    const { error: dbError } = await supabase.from("photo_cards").insert({
      share_id: shareId,
      image_url: imageUrl,
      address,
      exif,
      analysis,
      visibility,
      user_id: user.id,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    logActivity(user.id, "photo_publish", { shareId, visibility });

    return NextResponse.json({ shareId, imageUrl });
  } catch (error) {
    console.error("Publish API error:", error);
    return NextResponse.json({ error: "게시 중 오류가 발생했습니다." }, { status: 500 });
  }
}
