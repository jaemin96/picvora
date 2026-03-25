import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { analyzeImage } from "@/lib/claude";
import { reverseGeocode } from "@/lib/kakao-geo";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_RAW_BYTES = Math.floor(MAX_BYTES / 1.37);

async function compressImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ base64: string; compressed: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }> {
  if (buffer.length <= MAX_RAW_BYTES) {
    return {
      base64: buffer.toString("base64"),
      compressed: buffer,
      mediaType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
    };
  }

  const widths = [2048, 1600, 1200];
  const qualities = [80, 60, 40];

  for (const width of widths) {
    for (const quality of qualities) {
      const resized = await sharp(buffer)
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();

      if (resized.length <= MAX_RAW_BYTES) {
        return { base64: resized.toString("base64"), compressed: resized, mediaType: "image/jpeg" };
      }
    }
  }

  const resized = await sharp(buffer).resize({ width: 800 }).jpeg({ quality: 40 }).toBuffer();
  return { base64: resized.toString("base64"), compressed: resized, mediaType: "image/jpeg" };
}

function buildExifContext(
  exif: Record<string, string | undefined>,
  address: string | null
): string {
  const parts: string[] = [];
  if (exif.latitude && exif.longitude) {
    parts.push(`GPS 좌표: ${exif.latitude}, ${exif.longitude}`);
  }
  if (address) {
    parts.push(`실제 주소 (역지오코딩): ${address}`);
  }
  if (exif.dateTime) {
    parts.push(`촬영 시간: ${exif.dateTime}`);
  }
  if (exif.make) {
    parts.push(`카메라: ${exif.make} ${exif.model || ""}`);
  }
  return parts.length > 0 ? `EXIF 정보:\n${parts.join("\n")}` : "EXIF 정보 없음";
}

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
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { base64, mediaType: contentType } = await compressImage(buffer, imageFile.type);

    const exifRaw = formData.get("exif") as string | null;
    const exif: Record<string, string | undefined> = exifRaw ? JSON.parse(exifRaw) : {};

    const lat = exif.latitude ? parseFloat(exif.latitude) : null;
    const lng = exif.longitude ? parseFloat(exif.longitude) : null;
    const address = lat && lng ? await reverseGeocode(lat, lng) : null;

    const exifContext = buildExifContext(exif, address);
    const analysis = await analyzeImage(base64, contentType, exifContext);

    return NextResponse.json({ analysis, exif, address });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
