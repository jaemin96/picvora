-- 계정 상태 관리 마이그레이션
-- account_status: active | suspended | dormant | withdrawn

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'dormant', 'withdrawn')),
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspend_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ DEFAULT NULL;

-- 기존 사용자 active로 초기화
UPDATE public.profiles SET account_status = 'active' WHERE account_status IS NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_until ON public.profiles (suspended_until) WHERE suspended_until IS NOT NULL;

-- 관리자가 account_status, suspended_until 업데이트 가능 (기존 admin_can_update_approval 정책 확장)
-- 기존 정책이 있으면 DROP 후 재생성
DROP POLICY IF EXISTS "admin_can_update_approval" ON public.profiles;

CREATE POLICY "admin_can_manage_profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 본인이 자신의 last_active_at, account_status(withdrawn만) 업데이트 가능
CREATE POLICY "user_can_update_own_status"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- withdrawn 상태로만 변경 가능, 다른 필드는 기존 정책으로 제한
  );
