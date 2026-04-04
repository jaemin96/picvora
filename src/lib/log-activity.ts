import { createClient } from "@supabase/supabase-js";

// RLS 우회를 위해 service_role key 사용 (서버사이드 전용)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type ActivityAction =
  | "login"
  | "photo_analyze"
  | "photo_publish"
  | "card_view"
  | "card_delete"
  | "like"
  | "comment"
  | "follow";

export async function logActivity(
  userId: string,
  action: ActivityAction,
  metadata?: Record<string, unknown>
) {
  try {
    await getAdminClient().from("activity_logs").insert({
      user_id: userId,
      action,
      metadata: metadata ?? {},
    });
  } catch {
    // 로그 실패는 무시 (메인 기능에 영향 없어야 함)
  }
}
