import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

// GET /api/admin/logs?userId=xxx&action=xxx&page=0&limit=50
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 관리자 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const userId = sp.get("userId") ?? null;
  const action = sp.get("action") ?? null;
  const page = parseInt(sp.get("page") ?? "0", 10);
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 100);
  const offset = page * limit;

  const admin = getAdminClient();

  let query = admin
    .from("activity_logs")
    .select("id, user_id, action, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq("user_id", userId);
  if (action) query = query.eq("action", action);

  const { data: logs, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 사용자 프로필 별도 조회
  const userIds = Array.from(new Set((logs ?? []).map((l) => l.user_id)));
  const profileMap: Record<string, { display_name: string | null; email: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, email, avatar_url")
      .in("id", userIds);
    (profiles ?? []).forEach((p) => { profileMap[p.id] = p; });
  }

  const result = (logs ?? []).map((l) => ({
    ...l,
    profiles: profileMap[l.user_id] ?? null,
  }));

  return NextResponse.json({ logs: result, total: count ?? 0 });
}
