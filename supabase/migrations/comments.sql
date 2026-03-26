-- ============================================================
-- 댓글 기능 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. comments 테이블
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     TEXT NOT NULL REFERENCES public.photo_cards(share_id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- null이면 최상위 댓글
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  like_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_card_id   ON public.comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id   ON public.comments(user_id);

-- 2. comment_likes 테이블 (유저당 댓글 1개 좋아요)
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- 3. blocked_users 테이블 (내가 차단한 유저)
CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- comments: 로그인 유저 조회, 본인만 삭제
CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- comment_likes: 본인만 관리
CREATE POLICY "comment_likes_select" ON public.comment_likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "comment_likes_insert" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_likes_delete" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- blocked_users: 본인만 관리
CREATE POLICY "blocked_select" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "blocked_insert" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocked_delete" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================================
-- RPC: 댓글 좋아요 토글 (atomic)
-- ============================================================
CREATE OR REPLACE FUNCTION public.toggle_comment_like(
  p_comment_id UUID,
  p_user_id    UUID
)
RETURNS BOOLEAN -- true = liked, false = unliked
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  existed BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id
  ) INTO existed;

  IF existed THEN
    DELETE FROM public.comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id;
    UPDATE public.comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_comment_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.comment_likes(comment_id, user_id) VALUES (p_comment_id, p_user_id);
    UPDATE public.comments SET like_count = like_count + 1 WHERE id = p_comment_id;
    RETURN TRUE;
  END IF;
END;
$$;

-- ============================================================
-- RPC: 카드별 댓글 수 (photo_cards 집계용)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_comment_count(p_card_id TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM public.comments WHERE card_id = p_card_id;
$$;
