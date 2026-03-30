import { createClient } from "@supabase/supabase-js";

// service_role 키를 사용하는 관리자 전용 클라이언트
// RLS를 우회하며, auth.admin API 사용 가능
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
