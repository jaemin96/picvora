-- follows 테이블: 팔로워/팔로잉 관계
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- 인덱스: 특정 유저의 팔로워 조회
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- 인덱스: 특정 유저의 팔로잉 조회
CREATE INDEX idx_follows_follower_id ON follows(follower_id);

-- RLS 활성화
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 유저가 팔로우 관계를 볼 수 있음
CREATE POLICY "follows_select" ON follows
  FOR SELECT TO authenticated
  USING (true);

-- 자신만 팔로우할 수 있음
CREATE POLICY "follows_insert" ON follows
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- 자신의 팔로우만 취소할 수 있음
CREATE POLICY "follows_delete" ON follows
  FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- profiles 테이블에 팔로워/팔로잉 카운트 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

-- 팔로우 시 카운트 증가 트리거
CREATE OR REPLACE FUNCTION update_follow_counts_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_follow_insert
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts_on_insert();

-- 언팔로우 시 카운트 감소 트리거
CREATE OR REPLACE FUNCTION update_follow_counts_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_follow_delete
  AFTER DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts_on_delete();
