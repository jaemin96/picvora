import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { analyzeImage } from "@/lib/claude";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (Anthropic 제한)
// base64 인코딩 시 ~1.37배 커지므로 원본 기준은 더 낮게 잡아야 함
const MAX_RAW_BYTES = Math.floor(MAX_BYTES / 1.37); // ~3.7MB

async function compressImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }> {
  // 원본이 3.7MB 이하면 그대로 사용 (base64 후 5MB 이내)
  if (buffer.length <= MAX_RAW_BYTES) {
    return {
      base64: buffer.toString("base64"),
      mediaType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
    };
  }

  // 5MB 넘으면 JPEG으로 리사이즈
  const widths = [2048, 1600, 1200];
  const qualities = [80, 60, 40];

  for (const width of widths) {
    for (const quality of qualities) {
      const resized = await sharp(buffer)
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();

      if (resized.length <= MAX_RAW_BYTES) {
        return {
          base64: resized.toString("base64"),
          mediaType: "image/jpeg",
        };
      }
    }
  }

  // 최후의 수단: 작은 크기로 강제 압축
  const resized = await sharp(buffer)
    .resize({ width: 800 })
    .jpeg({ quality: 40 })
    .toBuffer();

  return {
    base64: resized.toString("base64"),
    mediaType: "image/jpeg",
  };
}

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

    // 이미지를 base64로 변환 (5MB 초과 시 자동 압축)
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { base64, mediaType: contentType } = await compressImage(
      buffer,
      imageFile.type
    );

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
