-- profiles 테이블에 승인 및 역할 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 기존 사용자들은 모두 승인 처리
UPDATE public.profiles SET is_approved = TRUE WHERE is_approved IS NULL;

-- 관리자 승인 관련 RLS 정책
-- 관리자는 모든 프로필의 is_approved를 업데이트 가능
CREATE POLICY "admin_can_update_approval"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 인덱스: 미승인 사용자 빠르게 조회
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles (is_approved) WHERE is_approved = FALSE;
