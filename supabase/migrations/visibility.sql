-- ============================================================
-- 게시글 공개범위 (visibility) 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. photo_cards 테이블에 visibility 컬럼 추가
--    'public'    = 전체 공개 (기본값)
--    'followers' = 팔로워에게만 공개
--    'private'   = 나만 보기
ALTER TABLE public.photo_cards
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

-- 2. 유효값 제약조건
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photo_cards_visibility_check'
  ) THEN
    ALTER TABLE public.photo_cards
      ADD CONSTRAINT photo_cards_visibility_check
      CHECK (visibility IN ('public', 'followers', 'private'));
  END IF;
END $$;

-- 3. visibility 컬럼 인덱스
CREATE INDEX IF NOT EXISTS idx_photo_cards_visibility
  ON public.photo_cards(visibility);
