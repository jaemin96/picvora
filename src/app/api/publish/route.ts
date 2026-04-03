import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "@/lib/nanoid";
import { logActivity } from "@/lib/log-activity";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const analysisRaw = formData.get("analysis") as string | null;
    const exifRaw = formData.get("exif") as string | null;
    const address = formData.get("address") as string | null;
    const visibilityRaw = (formData.get("visibility") as string | null) ?? "public";
    const visibility = ["public", "followers", "private"].includes(visibilityRaw) ? visibilityRaw : "public";
    const imageFile = formData.get("image") as File | null;

    if (!analysisRaw) {
      return NextResponse.json({ error: "분석 데이터가 없습니다." }, { status: 400 });
    }

    const analysis = JSON.parse(analysisRaw);
    const exif = exifRaw ? JSON.parse(exifRaw) : {};

    const shareId = nanoid();
    let imageUrl: string | null = null;

    // 이미지 업로드
    if (imageFile) {
      const fileName = `${user.id}/${shareId}.jpg`;
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, buffer, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        console.error("Storage upload error:", JSON.stringify(uploadError));
      } else {
        const { data } = supabase.storage.from("photos").getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }
    }

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
