-- ============================================================
-- 소프트 삭제 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. photo_cards 테이블에 deleted_at 컬럼 추가
ALTER TABLE public.photo_cards
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. 삭제되지 않은 카드만 빠르게 조회하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_photo_cards_deleted_at
  ON public.photo_cards(deleted_at)
  WHERE deleted_at IS NULL;

-- 3. RLS: 본인 카드 update 허용 (soft-delete/restore 용)
--    기존에 update 정책이 없다면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'photo_cards' AND policyname = 'photo_cards_update_own'
  ) THEN
    CREATE POLICY "photo_cards_update_own"
      ON public.photo_cards FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. RLS: 본인 카드 delete 허용 (완전삭제용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'photo_cards' AND policyname = 'photo_cards_delete_own'
  ) THEN
    CREATE POLICY "photo_cards_delete_own"
      ON public.photo_cards FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
