import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/view  { cardId }
// 쿠키 없을 때만 view_count 증가 후 쿠키 세팅 (24시간)
export async function POST(request: NextRequest) {
  const { cardId } = await request.json();
  if (!cardId) return NextResponse.json({ ok: false }, { status: 400 });

  // 브라우저 단위 24시간 제한 (계정 무관)
  const cookieStore = cookies();
  const viewedKey = `viewed_${cardId}`;

  const supabase = createClient();

  if (cookieStore.get(viewedKey)) {
    return NextResponse.json({ ok: true, incremented: false });
  }

  await supabase.rpc("increment_view_count", { card_share_id: cardId });

  cookieStore.set(viewedKey, "1", {
    maxAge: 60 * 60 * 24,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  return NextResponse.json({ ok: true, incremented: true });
}
