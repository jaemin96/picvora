import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

// 문의 목록 조회
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const admin = await verifyAdmin(supabase);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";
  const page = parseInt(searchParams.get("page") ?? "0", 10);
  const PAGE_SIZE = 20;

  let query = adminClient
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// 답변 작성 + 상태 변경
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const admin = await verifyAdmin(supabase);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const body = await req.json();
  const { ticketId, admin_reply, status } = body;

  if (!ticketId) {
    return NextResponse.json({ error: "ticketId가 필요합니다" }, { status: 400 });
  }

  const validStatuses = ["open", "answered", "closed"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "유효하지 않은 status입니다" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (admin_reply !== undefined) {
    updates.admin_reply = admin_reply;
    if (admin_reply) {
      updates.status = "answered";
      updates.replied_at = new Date().toISOString();
    }
  }

  const { error } = await adminClient
    .from("support_tickets")
    .update(updates)
    .eq("id", ticketId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "업데이트 완료" });
}
