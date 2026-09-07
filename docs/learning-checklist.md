# Picvora 학습 체크리스트

> 목표: **AI 없이도 유지보수 가능한 수준**으로 내 코드를 이해하기.
> 각 항목을 열어 코드를 직접 읽고, "이게 왜 이렇게 짜였는지" 설명할 수 있으면 체크한다.
> 상세 설명은 [server-features.md](server-features.md) 참고. 체크 규칙:
>
> - `[ ]` 아직 안 봄 · `[~]` 코드는 읽음(이해 애매) · `[x]` 남에게 설명 가능
>
> **추천 학습 순서**: 0(공통) → 3(분석·게시) → 4(카드) → 5(소셜) → 2(계정) → 6~9(검색·문의·관리자·크론) → 10(React/서버 개념).

---

## 0. 인프라 · 공통 (여기부터 시작)

- [ ] **`createClient` (서버)** — RLS가 적용되는 사용자 컨텍스트 클라이언트란 무엇인가 · [server.ts](../src/lib/supabase/server.ts)
- [ ] **`createAdminClient`** — service_role이 RLS를 우회한다는 의미, 왜 서버 전용인가 · [admin.ts](../src/lib/supabase/admin.ts)
- [ ] **`createClient` (브라우저)** — 클라이언트에서 Supabase를 직접 쓰는 경우(로그인·Storage 업로드) · [client.ts](../src/lib/supabase/client.ts)
- [ ] **`middleware.ts`** — 페이지 진입 전 인증/계정상태 가드, 리다이렉트 규칙, matcher 제외 대상 · [middleware.ts](../src/middleware.ts)
- [ ] **`logActivity`** — fire-and-forget 로깅, 실패 무시 패턴, 액션 종류 8가지 · [log-activity.ts](../src/lib/log-activity.ts)
- [ ] **인증 게이트 패턴** — 모든 라우트가 `getUser() → 없으면 401`로 시작하는 이유

---

## 1. 사진 분석 · 게시 (핵심 플로우)

- [ ] **`extractExifData`** — exifr로 브라우저에서 EXIF 뽑기, 어떤 필드를 pick하는지 · [exif.ts](../src/lib/exif.ts)
- [ ] **`POST /api/analyze`** — 전체 흐름(인증→압축→역지오코딩→프롬프트→Claude→응답) · [analyze/route.ts](../src/app/api/analyze/route.ts)
- [ ] **`compressImage`** — sharp로 크기·품질을 단계적으로 낮춰 한도 맞추기 (analyze 내부)
- [ ] **`buildExifContext`** — EXIF를 프롬프트용 텍스트로 정리 (analyze 내부)
- [ ] **`analyzeImage`** — Claude 호출, 응답에서 정규식으로 JSON 추출, 반환 스키마 · [claude.ts](../src/lib/claude.ts)
- [ ] **`claude-models.ts`** — 모델 목록/기본값, 모델 선택이 UI까지 어떻게 이어지는지 · [claude-models.ts](../src/lib/claude-models.ts)
- [ ] **`reverseGeocode`** — Kakao로 좌표→주소 · [kakao-geo.ts](../src/lib/kakao-geo.ts)
- [ ] **`POST /api/publish`** — 이미지는 클라이언트가 Storage에 먼저 올리고 URL만 저장하는 구조 · [publish/route.ts](../src/app/api/publish/route.ts)
- [ ] **`nanoid` / shareId** — 카드 공개 식별자 겸 URL이 어디서 생성되나 · [nanoid.ts](../src/lib/nanoid.ts)
- [ ] **연관 UI: `upload-flow.tsx`** — 단계(step) state, Storage 업로드→publish 호출 순서 · [upload-flow.tsx](../src/components/features/upload-flow.tsx)
- [ ] **연관 UI: `usePhotoStore`** — 업로드 단계 간 상태 공유(Zustand) · [photo-store.ts](../src/stores/photo-store.ts)

---

## 2. 인증 · 계정 관리

- [ ] **`GET /api/signup/check-email`** — 이메일 중복 확인, admin client 사용 이유 · [check-email/route.ts](../src/app/api/signup/check-email/route.ts)
- [ ] **`POST /api/auth/login-log`** — 로그인 로그 · [login-log/route.ts](../src/app/api/auth/login-log/route.ts)
- [ ] **`GET/PUT /api/profile`** — user_metadata vs profiles 테이블 이중 저장·동기화 · [profile/route.ts](../src/app/api/profile/route.ts)
- [ ] **`POST /api/profile/avatar`** — Storage upsert 업로드 + 캐시버스터(`?t=`) · [avatar/route.ts](../src/app/api/profile/avatar/route.ts)
- [ ] **`POST /api/account/withdraw`** — 비번 재확인, 소프트 탈퇴(상태만 변경) · [withdraw/route.ts](../src/app/api/account/withdraw/route.ts)
- [ ] **연관 UI: `my/page.tsx`** — 프로필 편집·아바타·탈퇴 흐름 · [my/page.tsx](../src/app/my/page.tsx)

---

## 3. 카드 조회 · 관리

- [ ] **`GET /api/cards`** — 커서 페이지네이션 + 공개범위 OR 조건 + 지역필터 + 프로필/댓글수 조인 · [cards/route.ts](../src/app/api/cards/route.ts)
- [ ] **공개범위 로직** — public / followers / private가 쿼리로 어떻게 구현되는지 (cards 내부)
- [ ] **`GET /api/my/liked`** — card_likes 기준 조인·커서 페이지네이션 · [my/liked/route.ts](../src/app/api/my/liked/route.ts)
- [ ] **`GET /api/users/[id]`** — 타인 프로필+카드, 팔로우 여부에 따른 노출 범위 · [users/[id]/route.ts](../src/app/api/users/[id]/route.ts)
- [ ] **`DELETE /api/cards/[id]`** — 소프트삭제 vs 완전삭제(`?permanent`), Storage 파일 제거 · [cards/[id]/route.ts](../src/app/api/cards/[id]/route.ts)
- [ ] **`PATCH /api/cards/[id]`** — restore / visibility / analysis 3분기 · [cards/[id]/route.ts](../src/app/api/cards/[id]/route.ts)
- [ ] **`POST /api/view`** — 쿠키 기반 24h 중복방지, RPC로 조회수 증가 · [view/route.ts](../src/app/api/view/route.ts)
- [ ] **`GET /api/regions`** — 주소 파싱으로 도/시→시군구 트리 생성 · [regions/route.ts](../src/app/api/regions/route.ts)
- [ ] **연관 UI: `use-infinite-cards`** — useInfiniteQuery로 무한스크롤 · [use-infinite-cards.ts](../src/hooks/use-infinite-cards.ts)
- [ ] **연관 UI: `feed-card` / `location-filter`** · [feed-card.tsx](../src/components/features/feed-card.tsx) · [location-filter.tsx](../src/components/features/location-filter.tsx)

---

## 4. 소셜 (좋아요 · 댓글 · 팔로우 · 알림)

- [ ] **`GET/POST /api/likes`** — 토글 패턴, Promise.all 병렬 조회 · [likes/route.ts](../src/app/api/likes/route.ts)
- [ ] **`/api/comments` (GET/POST/DELETE/PATCH)** — 대댓글(parent_id), 차단 필터, 프로필 조인 · [comments/route.ts](../src/app/api/comments/route.ts)
- [ ] **`toggle_comment_like` RPC** — 좋아요+카운트를 원자적으로 처리하는 이유 · [comments.sql](../supabase/migrations/comments.sql)
- [ ] **`POST /api/comments/block`** — 차단 토글이 댓글 조회에 미치는 영향 · [block/route.ts](../src/app/api/comments/block/route.ts)
- [ ] **`GET/POST /api/follows`** — 토글, 카운트를 profiles 캐시 컬럼에서 읽기 · [follows/route.ts](../src/app/api/follows/route.ts)
- [ ] **`GET /api/follows/list`** — followers/following + is_following/is_me 플래그 · [follows/list/route.ts](../src/app/api/follows/list/route.ts)
- [ ] **`GET/PATCH /api/notifications`** — 목록·읽음처리·unread_count, actor/썸네일 조인 · [notifications/route.ts](../src/app/api/notifications/route.ts)
- [ ] **DB 트리거 전체** — 좋아요·댓글·팔로우 시 카운트 증감 & 알림 자동생성, `unique_notification` 중복방지, Realtime 구독 · [notifications.sql](../supabase/migrations/notifications.sql) · [follows.sql](../supabase/migrations/follows.sql)
- [ ] **연관 UI: like/comment/follow-button, notification-bell** · [notification-bell.tsx](../src/components/features/notification-bell.tsx)

---

## 5. 검색

- [ ] **`GET /api/search`** — 주소 DB검색 + 태그/메시지 클라이언트 필터의 합집합, 사용자 검색 · [search/route.ts](../src/app/api/search/route.ts)
- [ ] **`GET /api/search-place`** — Kakao 키워드 검색(수동 위치 지정용) · [search-place/route.ts](../src/app/api/search-place/route.ts)
- [ ] **연관 UI: search-bar / location-search** · [search-bar.tsx](../src/components/features/search-bar.tsx) · [location-search.tsx](../src/components/features/location-search.tsx)

---

## 6. 문의 · 챗봇

- [ ] **`GET/POST /api/support`** — 문의 접수(비로그인 허용) / 내 문의 내역, 길이 검증 · [support/route.ts](../src/app/api/support/route.ts)
- [ ] **연관 UI: chatbot-panel / faq-data** — FAQ 즉답 + 문의 흐름 · [chatbot-panel.tsx](../src/components/features/chatbot-panel.tsx) · [faq-data.ts](../src/lib/faq-data.ts)

---

## 7. 관리자

- [ ] **`verifyAdmin` 패턴** — role 확인 후 admin client 전환 (세 admin 라우트 공통)
- [ ] **`GET/PATCH /api/admin/users`** — 승인/거절/정지/휴면/복구/탈퇴 7액션, 관리자 보호 · [admin/users/route.ts](../src/app/api/admin/users/route.ts)
- [ ] **`account_status` ↔ middleware** — 상태값이 실제 접근차단으로 이어지는 연결고리
- [ ] **`GET /api/admin/logs`** — 필터·페이지네이션·count:exact, 프로필 조인 · [admin/logs/route.ts](../src/app/api/admin/logs/route.ts)
- [ ] **`GET/PATCH /api/admin/support`** — 문의 목록/답변, 답변 시 상태 자동전환 · [admin/support/route.ts](../src/app/api/admin/support/route.ts)
- [ ] **연관 UI: `admin/page.tsx`** — 탭 구조(사용자/로그/문의) · [admin/page.tsx](../src/app/admin/page.tsx)

---

## 8. 운영 · 크론

- [ ] **`GET /api/cron/ping`** — Supabase pause 방지, CRON_SECRET 인증 · [cron/ping/route.ts](../src/app/api/cron/ping/route.ts)
- [ ] **`vercel.json` cron** — 스케줄 표기(`0 0 * * *`) · [vercel.json](../vercel.json)

---

## 9. 반복 패턴 (한 번 익히면 전체가 쉬워짐)

- [ ] **인증 게이트** — `getUser → 401`
- [ ] **커서 페이지네이션** — `limit+1` 트릭 + `nextCursor`
- [ ] **N+1 회피** — `user_id` 모아 `profiles ... in(...)` 일괄 조회 + map 병합
- [ ] **토글 API** — 있으면 delete / 없으면 insert
- [ ] **집계 정규화** — `[{count:n}]` → 숫자
- [ ] **RLS vs service_role** — 언제 어느 클라이언트를 쓰는가(권한 경계)
- [ ] **트리거 위임** — 카운트·알림은 API가 아닌 Postgres 트리거

---

## 10. 밑바탕 개념 (실력 끌어올리기)

### React / Next.js
- [ ] **Server Component vs Client Component** — `"use client"`가 붙는 기준, 데이터 패칭 위치
- [ ] **App Router 라우팅** — `page.tsx` / `route.ts` / `[id]` 동적 세그먼트 / `layout.tsx`
- [ ] **Route Handler** — `export async function GET/POST/...`가 곧 API인 구조
- [ ] **TanStack Query** — `useInfiniteQuery`, 캐시·`getNextPageParam` (서버 상태)
- [ ] **Zustand** — 전역 클라이언트 상태, store 액션 (클라이언트 상태)
- [ ] **에러 처리 컨벤션** — API 호출 `try-catch` + 에러 Toast(sonner) (CLAUDE.md 규약)

### 서버 / 백엔드
- [ ] **Supabase Auth** — 쿠키 세션, `getUser()`, `user_metadata`
- [ ] **RLS(Row Level Security)** — 정책이 "본인 데이터만"을 DB에서 강제하는 방식
- [ ] **Postgres 트리거 · RPC** — `SECURITY DEFINER`, 원자적 연산을 DB로 내리는 이유
- [ ] **Supabase Storage** — 버킷(`photos`/`avatars`), publicUrl, upsert, 파일 경로 규칙
- [ ] **서버리스 제약** — Vercel 함수 바디 크기(4.5MB) 때문에 클라이언트 사전 압축이 필요한 이유
- [ ] **외부 API 연동** — Kakao Local(역지오코딩/검색), Anthropic(이미지 분석) 호출·에러 처리
- [ ] **환경변수 경계** — `NEXT_PUBLIC_*`(공개) vs 서버 전용(`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `KAKAO_REST_API_KEY`, `CRON_SECRET`)

---

### 진행 현황 메모 (자유 기록)
> 학습하며 헷갈렸던 점 / 리팩터링 아이디어를 여기에 적어두면 좋다.

-
