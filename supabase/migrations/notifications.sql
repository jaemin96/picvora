-- ============================================================
-- 알림 기능 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. notifications 테이블
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 받는 사람
  actor_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 행동한 사람
  type        TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'comment_like')),
  card_id     TEXT REFERENCES public.photo_cards(share_id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 중복 방지: 같은 유저가 같은 대상에 같은 타입의 알림은 1개만
  CONSTRAINT unique_notification UNIQUE (user_id, actor_id, type, card_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 조회/수정 가능
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 트리거에서 삽입 (SECURITY DEFINER 함수가 처리)
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 트리거 함수: 좋아요 → 알림
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  card_owner UUID;
BEGIN
  -- 카드 작성자 조회
  SELECT user_id INTO card_owner
  FROM public.photo_cards
  WHERE share_id = NEW.card_id;

  -- 자기 자신 좋아요는 알림 없음
  IF card_owner IS NULL OR card_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, card_id)
  VALUES (card_owner, NEW.user_id, 'like', NEW.card_id)
  ON CONFLICT ON CONSTRAINT unique_notification DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.card_likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.card_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- ============================================================
-- 트리거 함수: 댓글 → 알림
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  card_owner UUID;
  parent_author UUID;
BEGIN
  -- 카드 작성자에게 알림 (자신이 댓글 단 경우 제외)
  SELECT user_id INTO card_owner
  FROM public.photo_cards
  WHERE share_id = NEW.card_id;

  IF card_owner IS NOT NULL AND card_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, card_id, comment_id)
    VALUES (card_owner, NEW.user_id, 'comment', NEW.card_id, NEW.id)
    ON CONFLICT ON CONSTRAINT unique_notification DO NOTHING;
  END IF;

  -- 대댓글이면 부모 댓글 작성자에게도 알림 (카드 작성자와 다를 경우, 자신 제외)
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author
    FROM public.comments
    WHERE id = NEW.parent_id;

    IF parent_author IS NOT NULL
      AND parent_author <> NEW.user_id
      AND parent_author <> card_owner THEN
      INSERT INTO public.notifications (user_id, actor_id, type, card_id, comment_id)
      VALUES (parent_author, NEW.user_id, 'comment', NEW.card_id, NEW.id)
      ON CONFLICT ON CONSTRAINT unique_notification DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- ============================================================
-- 트리거 함수: 팔로우 → 알림
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow')
  ON CONFLICT ON CONSTRAINT unique_notification DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- ============================================================
-- 트리거 함수: 댓글 좋아요 → 알림
-- (toggle_comment_like RPC가 comment_likes를 직접 조작하므로 트리거로 처리)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  comment_author UUID;
  comment_card_id TEXT;
BEGIN
  -- 댓글 작성자 + 카드 ID 조회
  SELECT user_id, card_id INTO comment_author, comment_card_id
  FROM public.comments
  WHERE id = NEW.comment_id;

  -- 자기 댓글 좋아요는 알림 없음
  IF comment_author IS NULL OR comment_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, card_id, comment_id)
  VALUES (comment_author, NEW.user_id, 'comment_like', comment_card_id, NEW.comment_id)
  ON CONFLICT ON CONSTRAINT unique_notification DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment_like ON public.comment_likes;
CREATE TRIGGER trg_notify_on_comment_like
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();

-- ============================================================
-- RPC: 미읽음 알림 수
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.notifications
  WHERE user_id = p_user_id AND is_read = FALSE;
$$;

-- ============================================================
-- Supabase Realtime: notifications 테이블 활성화
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
