-- activity_logs: 사용자 기능 사용 로그
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- 인덱스
create index if not exists activity_logs_user_id_idx on public.activity_logs(user_id);
create index if not exists activity_logs_action_idx on public.activity_logs(action);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);

-- RLS: 관리자만 전체 조회 가능, 일반 유저는 읽기 불가
alter table public.activity_logs enable row level security;

-- 서버사이드(service_role)에서만 insert 가능 — anon/authenticated insert 불가
-- 관리자 조회용 policy (admin role 확인)
create policy "admin_read_logs" on public.activity_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
