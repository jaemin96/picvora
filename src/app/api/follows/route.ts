import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/log-activity";

export const dynamic = "force-dynamic";

// GET /api/follows?userId=xxx — 팔로우 카운트 + 내가 팔로우했는지 여부
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUserId = req.nextUrl.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // 카운트 조회 (profiles 테이블에서)
  const { data: profile } = await supabase
    .from("profiles")
    .select("follower_count, following_count")
    .eq("id", targetUserId)
    .single();

  // 내가 이 유저를 팔로우하고 있는지
  const { data: followRow } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  return NextResponse.json({
    follower_count: profile?.follower_count ?? 0,
    following_count: profile?.following_count ?? 0,
    is_following: !!followRow,
  });
}

// POST /api/follows — 팔로우/언팔로우 토글
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetUserId } = await req.json();
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  // 이미 팔로우 중인지 확인
  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existing) {
    // 언팔로우
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ action: "unfollowed" });
  } else {
    // 팔로우
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetUserId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    logActivity(user.id, "follow", { targetUserId });
    return NextResponse.json({ action: "followed" });
  }
}
