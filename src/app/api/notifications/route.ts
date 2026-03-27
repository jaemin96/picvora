import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/notifications?limit=20&offset=0
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "20");
  const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0");

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, type, card_id, comment_id, is_read, created_at, actor_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = notifications ?? [];

  // actor 프로필 일괄 조회
  const actorIds = Array.from(new Set(list.map((n) => n.actor_id)));
  let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, email")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      const name = p.display_name || (p.email ? p.email.split("@")[0] : null);
      profileMap[p.id] = { display_name: name, avatar_url: p.avatar_url };
    }
  }

  // 카드 썸네일 일괄 조회
  const cardIds = Array.from(new Set(list.map((n) => n.card_id).filter(Boolean)));
  let cardMap: Record<string, { image_url: string | null }> = {};
  if (cardIds.length > 0) {
    const { data: cards } = await supabase
      .from("photo_cards")
      .select("share_id, image_url")
      .in("share_id", cardIds as string[]);
    for (const c of cards ?? []) {
      cardMap[c.share_id] = { image_url: c.image_url };
    }
  }

  const result = list.map((n) => ({
    ...n,
    actor: profileMap[n.actor_id] ?? null,
    card_thumbnail: n.card_id ? (cardMap[n.card_id]?.image_url ?? null) : null,
  }));

  // 미읽음 수
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({ notifications: result, unread_count: unreadCount ?? 0 });
}

// PATCH /api/notifications — 읽음 처리
// body: { ids?: string[] }  ids 없으면 전체 읽음
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json().catch(() => ({ ids: undefined }));

  let query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id);

  if (ids && Array.isArray(ids) && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
