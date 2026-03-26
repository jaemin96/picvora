import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUserId = params.id;

  // profiles 테이블에서 display_name, avatar_url 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", targetUserId)
    .single();

  // 해당 유저의 photo_cards 조회 (삭제된 카드 제외)
  const { data: cards, error } = await supabase
    .from("photo_cards")
    .select("share_id, image_url, address, analysis, created_at, view_count, comment_count:comments(count)")
    .eq("user_id", targetUserId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // comment_count 정규화
  const normalizedCards = (cards ?? []).map((card) => {
    const raw = card.comment_count;
    const count = Array.isArray(raw) && raw.length > 0 ? (raw[0] as { count: number }).count : 0;
    return { ...card, comment_count: count };
  });

  return NextResponse.json({
    profile: {
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
    cards: normalizedCards,
  });
}
