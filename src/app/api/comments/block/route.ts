import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/comments/block  { blockedId }  → 차단/차단해제 토글
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blockedId } = await request.json();
  if (!blockedId) return NextResponse.json({ error: "blockedId required" }, { status: 400 });
  if (blockedId === user.id) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });

  const { data: existing } = await supabase
    .from("blocked_users")
    .select("blocker_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);
    return NextResponse.json({ blocked: false });
  } else {
    await supabase
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: blockedId });
    return NextResponse.json({ blocked: true });
  }
}
