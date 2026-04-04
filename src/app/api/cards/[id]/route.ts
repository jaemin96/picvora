import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/log-activity";

// DELETE /api/cards/[id] — 소프트삭제 (기본) / 완전삭제 (?permanent=true)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permanent = request.nextUrl.searchParams.get("permanent") === "true";

  // 본인 카드인지 확인
  const { data: card, error: fetchError } = await supabase
    .from("photo_cards")
    .select("share_id, user_id, image_url")
    .eq("share_id", params.id)
    .single();

  if (fetchError || !card) {
    return NextResponse.json({ error: "카드를 찾을 수 없습니다" }, { status: 404 });
  }
  if (card.user_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  if (permanent) {
    // 완전삭제: 관련 데이터 + 스토리지 + DB row 삭제
    await supabase.from("comments").delete().eq("card_id", card.share_id);
    await supabase.from("card_likes").delete().eq("card_id", card.share_id);

    if (card.image_url) {
      const filePath = `${user.id}/${card.share_id}.jpg`;
      await supabase.storage.from("photos").remove([filePath]);
    }

    const { error: deleteError } = await supabase
      .from("photo_cards")
      .delete()
      .eq("share_id", card.share_id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    logActivity(user.id, "card_delete", { cardId: card.share_id, type: "permanent" });
    return NextResponse.json({ ok: true, action: "permanent" });
  }

  // 소프트삭제
  const { error: softError } = await supabase
    .from("photo_cards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("share_id", card.share_id)
    .eq("user_id", user.id);

  if (softError) {
    return NextResponse.json({ error: softError.message }, { status: 500 });
  }

  logActivity(user.id, "card_delete", { cardId: card.share_id, type: "soft" });
  return NextResponse.json({ ok: true, action: "soft-delete" });
}

// PATCH /api/cards/[id]
// body: { action: "restore" } → 복구
// body: { analysis: {...} } → 분석 수정 (기존)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // 복구
  if (body.action === "restore") {
    const { error } = await supabase
      .from("photo_cards")
      .update({ deleted_at: null })
      .eq("share_id", params.id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "restored" });
  }

  // 공개범위 변경
  if (body.visibility) {
    const validValues = ["public", "followers", "private"];
    if (!validValues.includes(body.visibility)) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }
    const { error } = await supabase
      .from("photo_cards")
      .update({ visibility: body.visibility })
      .eq("share_id", params.id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, visibility: body.visibility });
  }

  // 분석 수정 (기존)
  const { analysis } = body;
  if (!analysis) return NextResponse.json({ error: "analysis or visibility required" }, { status: 400 });

  const { error } = await supabase
    .from("photo_cards")
    .update({ analysis })
    .eq("share_id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
