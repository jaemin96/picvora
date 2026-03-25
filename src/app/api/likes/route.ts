import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/likes?cardId=xxx — 내가 좋아요 했는지 + 총 개수
export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("cardId");
  if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ count }, { data: myLike }] = await Promise.all([
    supabase
      .from("card_likes")
      .select("*", { count: "exact", head: true })
      .eq("card_id", cardId),
    user
      ? supabase
          .from("card_likes")
          .select("id")
          .eq("card_id", cardId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({ count: count ?? 0, liked: !!myLike });
}

// POST /api/likes — 좋아요 토글
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await request.json();
  if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("card_likes")
    .select("id")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("card_likes").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  } else {
    await supabase.from("card_likes").insert({ card_id: cardId, user_id: user.id });
    return NextResponse.json({ liked: true });
  }
}
