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
    .select("id, display_name, avatar_url, is_approved, role, created_at, account_status, suspended_until, suspend_reason, last_active_at, withdrawn_at")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_approved", false).neq("role", "admin");
  } else if (filter === "suspended") {
    query = query.eq("account_status", "suspended");
  } else if (filter === "dormant") {
    query = query.eq("account_status", "dormant");
  } else if (filter === "withdrawn") {
    query = query.eq("account_status", "withdrawn");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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

// 사용자 계정 관리 (승인/거절/정지/해제/휴면/복구/탈퇴처리)
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const admin = await verifyAdmin(supabase);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const body = await req.json();
  const { userId, action, days, reason } = body;

  const validActions = ["approve", "reject", "suspend", "unsuspend", "set_dormant", "restore", "withdraw"];
  if (!userId || !validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 대상 유저가 관리자인지 확인 (관리자는 조작 불가)
  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (targetProfile?.role === "admin") {
    return NextResponse.json({ error: "관리자 계정은 조작할 수 없습니다" }, { status: 403 });
  }

  switch (action) {
    case "approve": {
      const { error } = await adminClient
        .from("profiles")
        .update({ is_approved: true, account_status: "active" })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "User approved" });
    }

    case "reject": {
      // 거절: auth 사용자 삭제 (cascade로 profile도 삭제됨)
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "User rejected and deleted" });
    }

    case "suspend": {
      // days: number(기간) | null(영구정지)
      const suspendedUntil = days != null ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
      const { error } = await adminClient
        .from("profiles")
        .update({
          account_status: "suspended",
          suspended_until: suspendedUntil,
          suspend_reason: reason ?? null,
        })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "User suspended", suspended_until: suspendedUntil });
    }

    case "unsuspend": {
      const { error } = await adminClient
        .from("profiles")
        .update({
          account_status: "active",
          suspended_until: null,
          suspend_reason: null,
        })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "User unsuspended" });
    }

    case "set_dormant": {
      const { error } = await adminClient
        .from("profiles")
        .update({ account_status: "dormant" })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "User set to dormant" });
    }

    case "restore": {
      // 휴면/탈퇴 → 활성 복구
      const { error } = await adminClient
        .from("profiles")
        .update({
          account_status: "active",
          suspended_until: null,
          suspend_reason: null,
          withdrawn_at: null,
        })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "User restored" });
    }

    case "withdraw": {
      // 관리자가 강제 탈퇴 처리 (auth 삭제 없이 상태만 변경)
      const { error } = await adminClient
        .from("profiles")
        .update({
          account_status: "withdrawn",
          withdrawn_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "User withdrawn" });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
