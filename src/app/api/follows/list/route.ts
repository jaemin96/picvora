import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/follows/list?userId=xxx&type=followers|following
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUserId = req.nextUrl.searchParams.get("userId");
  const type = req.nextUrl.searchParams.get("type"); // "followers" | "following"

  if (!targetUserId || !type) {
    return NextResponse.json({ error: "userId and type required" }, { status: 400 });
  }

  if (type === "followers") {
    // 이 유저를 팔로우하는 사람들
    const { data: rows, error } = await supabase
      .from("follows")
      .select("follower_id, created_at")
      .eq("following_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = (rows ?? []).map((r) => r.follower_id);
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // 프로필 정보 조회
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    // 내가 이 사람들을 팔로우하고 있는지
    const { data: myFollows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", userIds);

    const myFollowSet = new Set((myFollows ?? []).map((f) => f.following_id));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const users = userIds.map((id) => ({
      id,
      display_name: profileMap.get(id)?.display_name ?? null,
      avatar_url: profileMap.get(id)?.avatar_url ?? null,
      is_following: myFollowSet.has(id),
      is_me: id === user.id,
    }));

    return NextResponse.json({ users });
  }

  if (type === "following") {
    // 이 유저가 팔로우하는 사람들
    const { data: rows, error } = await supabase
      .from("follows")
      .select("following_id, created_at")
      .eq("follower_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = (rows ?? []).map((r) => r.following_id);
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const { data: myFollows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", userIds);

    const myFollowSet = new Set((myFollows ?? []).map((f) => f.following_id));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const users = userIds.map((id) => ({
      id,
      display_name: profileMap.get(id)?.display_name ?? null,
      avatar_url: profileMap.get(id)?.avatar_url ?? null,
      is_following: myFollowSet.has(id),
      is_me: id === user.id,
    }));

    return NextResponse.json({ users });
  }

  return NextResponse.json({ error: "type must be followers or following" }, { status: 400 });
}
