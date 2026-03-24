import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/claude";

// exifr는 브라우저용이므로 서버에서는 간단히 EXIF 컨텍스트 문자열만 구성
function buildExifContext(exif: Record<string, string | undefined>): string {
  const parts: string[] = [];
  if (exif.latitude && exif.longitude) {
    parts.push(`GPS 좌표: ${exif.latitude}, ${exif.longitude}`);
  }
  if (exif.dateTime) {
    parts.push(`촬영 시간: ${exif.dateTime}`);
  }
  if (exif.make) {
    parts.push(`카메라: ${exif.make} ${exif.model || ""}`);
  }
  return parts.length > 0
    ? `EXIF 정보:\n${parts.join("\n")}`
    : "EXIF 정보 없음";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 이미지를 base64로 변환
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // 미디어 타입 결정
    const contentType = imageFile.type as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/gif";

    // 클라이언트에서 보낸 EXIF 정보를 formData에서 가져오기 (선택)
    const exifRaw = formData.get("exif") as string | null;
    const exif: Record<string, string | undefined> = exifRaw
      ? JSON.parse(exifRaw)
      : {};

    const exifContext = buildExifContext(exif);

    // Claude Vision으로 분석
    const analysis = await analyzeImage(base64, contentType, exifContext);

    return NextResponse.json({
      analysis,
      exif,
    });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
