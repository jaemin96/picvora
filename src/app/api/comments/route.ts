import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/comments?cardId=xxx
// 카드별 댓글 목록 (profiles join, 좋아요 여부, 차단 필터링)
export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("cardId");
  if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 차단 목록 가져오기 (로그인 시)
  let blockedIds: string[] = [];
  if (user) {
    const { data: blocked } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    blockedIds = (blocked ?? []).map((b) => b.blocked_id);
  }

  // 댓글 목록
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, card_id, user_id, parent_id, content, like_count, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/comments] error:", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  const list = comments ?? [];

  // 작성자 프로필 일괄 조회
  const userIds = Array.from(new Set(list.map((c) => c.user_id)));
  let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    }
  }

  // 내가 좋아요한 comment_ids
  let likedIds: Set<string> = new Set();
  if (user && list.length > 0) {
    const ids = list.map((c) => c.id);
    const { data: myLikes } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", ids);
    likedIds = new Set((myLikes ?? []).map((l) => l.comment_id));
  }

  // 차단된 유저 댓글 제거
  const filtered = list.filter((c) => !blockedIds.includes(c.user_id));

  const result = filtered.map((c) => ({
    ...c,
    profiles: profileMap[c.user_id] ?? null,
    liked: likedIds.has(c.id),
  }));

  return NextResponse.json({ comments: result, blockedIds });
}

// POST /api/comments  { cardId, content, parentId? }
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId, content, parentId } = await request.json();
  if (!cardId || !content?.trim()) {
    return NextResponse.json({ error: "cardId and content required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      card_id: cardId,
      user_id: user.id,
      parent_id: parentId ?? null,
      content: content.trim(),
    })
    .select("id, card_id, user_id, parent_id, content, like_count, created_at")
    .single();

  if (error) {
    console.error("[POST /api/comments] error:", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  // 작성자 프로필
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    comment: { ...data, profiles: profile ?? null, liked: false },
  });
}

// DELETE /api/comments  { commentId }
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await request.json();
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PATCH /api/comments  { commentId } → 좋아요 토글
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await request.json();
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  const { data: liked, error } = await supabase.rpc("toggle_comment_like", {
    p_comment_id: commentId,
    p_user_id: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ liked });
}
