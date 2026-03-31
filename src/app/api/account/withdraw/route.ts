import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 본인 탈퇴 처리
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: "비밀번호를 입력해주세요" }, { status: 400 });
  }

  // 비밀번호 재확인
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  if (signInError) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 400 });
  }

  // 관리자 계정은 탈퇴 불가
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    return NextResponse.json({ error: "관리자 계정은 탈퇴할 수 없습니다" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // account_status = withdrawn 처리 (데이터 보존, 복구 가능)
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({
      account_status: "withdrawn",
      withdrawn_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 세션 종료
  await supabase.auth.signOut();

  return NextResponse.json({ message: "탈퇴가 완료되었습니다" });
}
