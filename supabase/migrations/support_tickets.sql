-- support_tickets 테이블 생성
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  message     TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  admin_reply TEXT,
  replied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
  ON public.support_tickets(created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 누구나 삽입 가능 (비로그인 지원)
CREATE POLICY "support_insert_anon" ON public.support_tickets
  FOR INSERT WITH CHECK (true);

-- 로그인 유저는 자기 티켓만 조회
CREATE POLICY "support_select_own" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- 관리자: createAdminClient()로 RLS 우회 (service_role key 사용)
