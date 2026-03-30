import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;

  return user;
}

// 사용자 목록 조회 (승인 대기 / 전체)
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const admin = await verifyAdmin(supabase);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "pending";

  let query = adminClient
    .from("profiles")
    .select("id, display_name, avatar_url, is_approved, role, created_at")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_approved", false).neq("role", "admin");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // auth.users에서 이메일 정보 가져오기
  const usersWithEmail = await Promise.all(
    (data ?? []).map(async (profile) => {
      const { data: authData } = await adminClient.auth.admin.getUserById(profile.id);
      return {
        ...profile,
        email: authData?.user?.email ?? "",
      };
    })
  );

  return NextResponse.json(usersWithEmail);
}

// 사용자 승인/거절
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const admin = await verifyAdmin(supabase);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { userId, action } = await req.json();

  if (!userId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "approve") {
    const { error } = await adminClient
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "User approved" });
  }

  if (action === "reject") {
    // 거절: auth 사용자 삭제 (cascade로 profile도 삭제됨)
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "User rejected and deleted" });
  }
}
