# Picvora 서버 기능 명세서

> 사진 업로드 → EXIF + AI 분석 → 장소 카드 생성 서비스의 **서버측(백엔드) 전 기능**을 정리한 문서.
> Next.js 14 App Router의 서버리스 구조라 별도 백엔드 서버가 없고, `src/app/api/**/route.ts` 파일 하나하나가 곧 하나의 API 엔드포인트다.
>
> **읽는 법**: 각 기능마다 `무엇을` / `요청·응답` / `내부 동작 핵심` / `연관 UI`로 나눠 설명한다.
> 학습 체크는 [learning-checklist.md](learning-checklist.md)에서 하나씩 진행.

---

## 0. 전체 구조 한눈에 보기

```
브라우저(클라이언트 컴포넌트)
   │  fetch("/api/...")
   ▼
Next.js Route Handler (src/app/api/**/route.ts)   ← 서버리스 함수 1개 = 파일 1개
   │
   ├─ Supabase (Postgres DB + Auth + Storage)      ← 데이터 저장/인증/이미지
   ├─ Anthropic Claude API                          ← 사진 AI 분석
   └─ Kakao Local API                               ← 좌표→주소, 장소 검색
```

- **인증 방식**: Supabase Auth. 로그인하면 브라우저에 `sb-*` 쿠키가 저장되고, 모든 API가 이 쿠키로 `supabase.auth.getUser()`를 호출해 "누가 요청했는지"를 판별한다.
- **접근 통제 2겹**:
  1. `src/middleware.ts` — 페이지 진입 시 로그인/승인/정지 상태를 검사해 리다이렉트.
  2. 각 API 라우트 첫머리의 `getUser()` 체크 — API 단위 인증.
  3. DB의 RLS(Row Level Security) 정책 — "본인 데이터만" 을 DB가 직접 강제.
- **핵심 테이블**: `photo_cards`(카드), `profiles`(사용자), `follows`, `card_likes`, `comments`/`comment_likes`, `blocked_users`, `notifications`, `activity_logs`, `support_tickets`.

---

## 1. 인프라 · 공통 유틸

API 라우트가 아니라, 모든 API가 공통으로 쓰는 "도구"들. 여기를 이해해야 나머지가 쉬워진다.

### 1.1 `createClient()` — 서버용 Supabase 클라이언트
- **파일**: [src/lib/supabase/server.ts](../src/lib/supabase/server.ts)
- **무엇을**: 서버(Route Handler, Server Component)에서 로그인한 사용자 신원으로 DB에 접근하는 Supabase 클라이언트를 만든다. `anon key` + 브라우저 쿠키를 사용하므로 **RLS 정책이 그대로 적용된다**(= 본인 데이터만).
- **연관**: 거의 모든 `/api/*` 라우트가 이 함수로 시작.

### 1.2 `createAdminClient()` / `getAdminClient()` — 관리자용 Supabase 클라이언트
- **파일**: [src/lib/supabase/admin.ts](../src/lib/supabase/admin.ts), 일부 라우트는 자체 정의
- **무엇을**: `SUPABASE_SERVICE_ROLE_KEY`를 사용하는 클라이언트. **RLS를 우회**하고 `auth.admin.*`(사용자 삭제·조회 등) API를 쓸 수 있다.
- **주의**: 이 키는 절대 클라이언트에 노출되면 안 됨(서버 전용 env). 관리자 API·활동로그·이메일 중복확인 등에서만 사용.
- **연관**: `admin/*`, `account/withdraw`, `signup/check-email`, `log-activity`, `cron/ping`.

### 1.3 `createClient()` — 브라우저용 Supabase 클라이언트
- **파일**: [src/lib/supabase/client.ts](../src/lib/supabase/client.ts)
- **무엇을**: 클라이언트 컴포넌트에서 직접 Supabase를 쓰는 용도. 실제로는 **로그인/로그아웃, Storage 이미지 업로드**(사진·아바타)에 사용. 데이터 CRUD는 대부분 자체 `/api`를 거친다.

### 1.4 `middleware.ts` — 라우트 가드(문지기)
- **파일**: [src/middleware.ts](../src/middleware.ts)
- **무엇을**: 페이지 요청이 라우트에 닿기 **전에** 가로채 인증/계정상태를 검사.
- **동작 규칙**:
  - 정적 파일(`.확장자`)·`/api/`·`/share/`는 통과(matcher에서 제외).
  - `/user/:id` → `/users/:id` 리다이렉트.
  - 비로그인 + 로그인/회원가입 페이지 아님 → `/login`.
  - `account_status`별 처리: `suspended`(기간 만료 시 자동 해제, 아니면 `sb-` 쿠키 삭제 후 `/login?reason=suspended`), `withdrawn` → `/login?reason=withdrawn`, `dormant` → `/login?reason=dormant`.
  - 미승인(`is_approved=false`) → `/pending`.
  - 일반 유저가 `/admin` 접근 → `/`.
  - 관리자는 전부 통과.
- **연관 UI**: `/login`, `/pending`, `/admin` 접근 흐름 전체.

### 1.5 `logActivity()` — 활동 로그 기록
- **파일**: [src/lib/log-activity.ts](../src/lib/log-activity.ts)
- **무엇을**: `activity_logs` 테이블에 사용자 행동을 기록. `service_role`로 넣기 때문에 RLS 무관하게 항상 저장.
- **액션 종류**: `login`, `photo_analyze`, `photo_publish`, `card_view`, `card_delete`, `like`, `comment`, `follow`.
- **특징**: `try/catch`로 감싸 **실패해도 메인 기능에 영향 없음**(로그는 부가 기능). `await` 없이 호출(fire-and-forget)하는 곳이 많다.
- **연관**: 관리자 로그 화면([/admin](../src/app/admin/page.tsx))에서 조회.

---

## 2. 인증 · 계정 관리

### 2.1 `GET /api/signup/check-email` — 이메일 중복 확인
- **파일**: [src/app/api/signup/check-email/route.ts](../src/app/api/signup/check-email/route.ts)
- **무엇을**: 회원가입 시 이메일이 이미 존재하는지 검사(`profiles`에서 조회). `createAdminClient()`로 RLS 우회.
- **요청**: `?email=foo@bar.com` → **응답**: `{ exists: boolean }`
- **연관 UI**: [signup/page.tsx](../src/app/signup/page.tsx) — 회원가입 폼에서 이메일 입력 시 실시간 중복 체크.

### 2.2 `POST /api/auth/login-log` — 로그인 기록
- **파일**: [src/app/api/auth/login-log/route.ts](../src/app/api/auth/login-log/route.ts)
- **무엇을**: 로그인 성공 직후 `logActivity(user.id, "login")` 호출.
- **연관 UI**: [login/page.tsx](../src/app/login/page.tsx) — 로그인 성공 후 fire-and-forget으로 호출.

### 2.3 `GET / PUT /api/profile` — 내 프로필 조회 / 수정
- **파일**: [src/app/api/profile/route.ts](../src/app/api/profile/route.ts)
- **GET**: 현재 로그인 사용자의 `id/email/display_name/username/avatar_url` + `profiles.role`(user/admin) 반환.
- **PUT**: `display_name/username/avatar_url`은 Auth의 `user_metadata`에, `email/password`는 Auth 계정 자체에 반영. 이어서 `profiles` 테이블의 `display_name/avatar_url`도 **동기화**(트리거 미비 대비).
- **연관 UI**:
  - [my/page.tsx](../src/app/my/page.tsx) — 마이페이지 프로필 편집/비밀번호 변경.
  - [app-header.tsx](../src/components/features/app-header.tsx), [page.tsx](../src/app/page.tsx), [users/[id]/page.tsx](../src/app/users/[id]/page.tsx) — 로그인 사용자/관리자 여부 판별용.

### 2.4 `POST /api/profile/avatar` — 아바타 업로드
- **파일**: [src/app/api/profile/avatar/route.ts](../src/app/api/profile/avatar/route.ts)
- **무엇을**: `multipart/form-data`로 받은 이미지를 Supabase Storage `avatars/{userId}/avatar.{ext}`에 `upsert` 업로드 → public URL을 얻어 `?t=타임스탬프`(캐시 무효화) 붙여 `user_metadata.avatar_url`에 저장.
- **응답**: `{ avatar_url }`
- **연관 UI**: [my/page.tsx](../src/app/my/page.tsx) — 프로필 사진 변경.

### 2.5 `POST /api/account/withdraw` — 회원 탈퇴(본인)
- **파일**: [src/app/api/account/withdraw/route.ts](../src/app/api/account/withdraw/route.ts)
- **무엇을**: 비밀번호 재확인(`signInWithPassword`) → 관리자 계정은 탈퇴 불가 → `profiles.account_status='withdrawn'` + `withdrawn_at` 세팅(**데이터는 보존, 복구 가능한 소프트 탈퇴**) → `signOut()`.
- **연관 UI**: [my/page.tsx](../src/app/my/page.tsx) — 계정 탈퇴 모달(비밀번호 입력).

---

## 3. 사진 분석 · 게시 (핵심 기능)

이 서비스의 심장. "사진 업로드 → AI 분석 → 카드 저장" 흐름.

### 3.1 `extractExifData()` — EXIF 추출 (클라이언트)
- **파일**: [src/lib/exif.ts](../src/lib/exif.ts)
- **무엇을**: `exifr` 라이브러리로 사진 파일에서 카메라/렌즈/GPS/촬영시간/노출값(ISO, 조리개, 셔터스피드, 초점거리)을 뽑는다. **브라우저에서 실행**(파일이 서버로 가기 전).
- **연관 UI**: [upload-flow.tsx](../src/components/features/upload-flow.tsx) — 업로드 즉시 EXIF 추출해 store에 저장.

### 3.2 `POST /api/analyze` — 사진 AI 분석 ⭐
- **파일**: [src/app/api/analyze/route.ts](../src/app/api/analyze/route.ts)
- **무엇을**: 업로드된 이미지 + EXIF를 받아 Claude에게 분석시켜 태그·분위기·주변장소·촬영팁 등 구조화된 JSON을 반환.
- **요청**: `FormData { image: File, exif: JSON문자열, model?: 모델ID }`
- **내부 동작 핵심**:
  1. 인증 체크(`getUser`).
  2. `compressImage()` — 이미지가 크면 `sharp`로 리사이즈/압축(Claude 입력 한도 `MAX_RAW_BYTES` = 약 3.6MB 이하로). 폭 2048→1600→1200, 품질 80→60→40 순으로 시도.
  3. EXIF에 GPS가 있으면 `reverseGeocode()`로 실제 주소 획득.
  4. `buildExifContext()` — GPS/주소/촬영시간/카메라를 텍스트로 정리해 프롬프트에 주입.
  5. `analyzeImage()` 호출 → 결과 JSON.
  6. `logActivity("photo_analyze")`.
- **응답**: `{ analysis, exif, address }`
- **에러 처리**: Claude 과부하(529/503)면 "AI 서버 과부하" 503 메시지로 변환.
- **연관 UI**: [upload-flow.tsx](../src/components/features/upload-flow.tsx)(메인 업로드 플로우), [photo-upload.tsx](../src/components/features/photo-upload.tsx).

### 3.3 `analyzeImage()` — Claude 호출 래퍼
- **파일**: [src/lib/claude.ts](../src/lib/claude.ts)
- **무엇을**: Anthropic SDK로 이미지 + 상세 프롬프트를 보내 아래 형태 JSON을 받는다:
  - `tags`(label/type: mood·location·time·subject·specialty), `mood`, `shortcutMessage`(감성 한줄), `nearbyPlaces`(GPS 5km 이내 실제 장소), `specialties`(특산물), `cameraInfo`(장비/설정 요약), `shootingTips`(촬영 꿀팁).
- **핵심 포인트**: 응답 텍스트에서 정규식 `/\{[\s\S]*\}/`로 JSON만 추출 후 `JSON.parse`. `nearbyPlaces`는 GPS 기준 근거리만 추천하도록 프롬프트에 강하게 명시.
- **모델**: [claude-models.ts](../src/lib/claude-models.ts) — Haiku 4.5(기본·빠름), Sonnet 4.6(균형).

### 3.4 `reverseGeocode()` — 좌표 → 주소 (Kakao)
- **파일**: [src/lib/kakao-geo.ts](../src/lib/kakao-geo.ts)
- **무엇을**: GPS(위도/경도)를 Kakao Local API로 한국 주소 문자열로 변환. 도로명주소 우선. 서버 전용(REST 키).
- **연관**: `analyze` 라우트가 사용.

### 3.5 `POST /api/publish` — 카드 게시(DB 저장) ⭐
- **파일**: [src/app/api/publish/route.ts](../src/app/api/publish/route.ts)
- **무엇을**: 분석이 끝난 데이터를 `photo_cards` 테이블에 insert. 이미지 파일 자체는 **클라이언트가 먼저 Storage에 올리고**, 여기서는 그 `imageUrl`만 받는다.
- **요청**: `{ shareId, imageUrl, analysis, visibility, exif, address }`
- **내부**: `visibility`는 `public|followers|private`만 허용(아니면 `public`). insert 후 `logActivity("photo_publish")`.
- **연관 UI**: [upload-flow.tsx](../src/components/features/upload-flow.tsx) — "게시" 단계. 흐름: `nanoid()`로 shareId 생성 → Storage `photos/{userId}/{shareId}.jpg` 업로드 → publicUrl 획득 → `/api/publish` 호출.
- **참고**: `shareId`는 [src/lib/nanoid.ts](../src/lib/nanoid.ts)의 10자리 랜덤 문자열이며 카드의 공개 식별자 겸 URL(`/cards/{shareId}`, `/share/{shareId}`).

---

## 4. 카드 조회 · 관리

### 4.1 `GET /api/cards` — 카드 목록(피드/마이) ⭐
- **파일**: [src/app/api/cards/route.ts](../src/app/api/cards/route.ts)
- **무엇을**: 홈 피드와 마이페이지 그리드에 쓰이는 **커서 기반 페이지네이션** 카드 목록.
- **쿼리 파라미터**:
  - `mine=true` — 내 카드만.
  - `feed=all|following` — 전체 vs 팔로잉 전용 피드.
  - `filters=[{region,city?}]` — 다중 지역 필터(JSON).
  - `cursor` — `created_at` ISO(이보다 과거 것 로드).
  - `limit` — 기본 18, 최대 50.
  - `include_deleted=true` — (마이페이지 한정) 삭제된 카드 포함.
- **공개범위 로직(핵심)**: 남의 카드를 볼 땐 `public` + (내가 팔로우하는 사람의 `followers` 카드) + 내 카드만 보이도록 `visibility` OR 조건을 동적으로 만든다. `following` 피드는 팔로잉한 사람의 카드로 한정.
- **부가 처리**: `comment_count`를 `comments(count)` 조인으로 가져와 `[{count}]` → 숫자로 정규화. 카드의 `user_id`들로 `profiles`를 일괄 조회해 작성자 이름·아바타를 붙임. `limit+1`개를 가져와 다음 페이지 존재 여부(`nextCursor`) 판단.
- **응답**: `{ cards, userId, nextCursor }`
- **연관 UI**:
  - [page.tsx](../src/app/page.tsx)(홈 피드), [my/page.tsx](../src/app/my/page.tsx)(내 카드).
  - [use-infinite-cards.ts](../src/hooks/use-infinite-cards.ts) — TanStack Query `useInfiniteQuery`로 무한스크롤 구현.
  - 카드 렌더: [feed-card.tsx](../src/components/features/feed-card.tsx).

### 4.2 `GET /api/my/liked` — 내가 좋아요한 카드
- **파일**: [src/app/api/my/liked/route.ts](../src/app/api/my/liked/route.ts)
- **무엇을**: `card_likes`를 기준으로(좋아요 누른 시각 DESC) 조인된 `photo_cards`를 커서 페이지네이션으로 반환. 삭제된 카드 제외, 지역 필터 지원(클라이언트단 필터).
- **연관 UI**: [my/page.tsx](../src/app/my/page.tsx) — "좋아요한 카드" 탭.

### 4.3 `GET /api/users/[id]` — 특정 유저 프로필 + 카드
- **파일**: [src/app/api/users/[id]/route.ts](../src/app/api/users/[id]/route.ts)
- **무엇을**: 남의 프로필 페이지용. 대상 유저의 `display_name/avatar_url` + 카드 목록(커서 페이지네이션)을 반환. 본인이 아니면 `isFollowing`에 따라 `public`만 or `public+followers`만 노출.
- **응답**: `{ profile, cards, nextCursor }`
- **연관 UI**: [users/[id]/page.tsx](../src/app/users/[id]/page.tsx) — 타인 프로필 페이지.

### 4.4 `DELETE /api/cards/[id]` — 카드 삭제(소프트/완전)
- **파일**: [src/app/api/cards/[id]/route.ts](../src/app/api/cards/[id]/route.ts)
- **무엇을**: 본인 카드 확인 후 삭제.
  - 기본(소프트): `deleted_at`에 현재시각 세팅 → 목록에서 숨김, 복구 가능.
  - `?permanent=true`(완전): 관련 `comments`·`card_likes` 삭제 + Storage의 `photos/{userId}/{shareId}.jpg` 제거 + DB row 삭제.
- **응답**: `{ ok, action: "soft-delete"|"permanent" }`, 각각 `logActivity("card_delete")`.
- **연관 UI**: [my/page.tsx](../src/app/my/page.tsx)(휴지통/영구삭제), [card-detail-client.tsx](../src/app/cards/[id]/card-detail-client.tsx).

### 4.5 `PATCH /api/cards/[id]` — 카드 복구 / 공개범위 / 분석 수정
- **파일**: [src/app/api/cards/[id]/route.ts](../src/app/api/cards/[id]/route.ts)
- **무엇을**: body에 따라 3가지 동작:
  - `{ action: "restore" }` — 소프트삭제 복구(`deleted_at=null`).
  - `{ visibility }` — 공개범위 변경(`public|followers|private`).
  - `{ analysis }` — AI 분석 내용 수정(직접 편집).
- **연관 UI**: [edit-card-client.tsx](../src/app/cards/[id]/edit/edit-card-client.tsx)(분석 편집), [card-detail-client.tsx](../src/app/cards/[id]/card-detail-client.tsx)(공개범위 토글), [my/page.tsx](../src/app/my/page.tsx)(복구).

### 4.6 `POST /api/view` — 조회수 증가
- **파일**: [src/app/api/view/route.ts](../src/app/api/view/route.ts)
- **무엇을**: 카드 상세 진입 시 조회수 +1. **브라우저 쿠키 `viewed_{cardId}`로 24시간 중복 방지**(계정 무관). 실제 증가는 DB RPC `increment_view_count`가 원자적으로 처리.
- **연관 UI**: [card-detail-client.tsx](../src/app/cards/[id]/card-detail-client.tsx) — 상세 페이지 마운트 시 호출.

### 4.7 `GET /api/regions` — 지역 필터 목록
- **파일**: [src/app/api/regions/route.ts](../src/app/api/regions/route.ts)
- **무엇을**: 모든 카드의 `address`를 스캔해 "도/시 → 시/군/구" 계층 목록을 생성(한글 정렬). 필터 UI의 선택지 소스.
- **응답**: `{ regions: [{ name, cities[] }] }`
- **연관 UI**: [location-filter.tsx](../src/components/features/location-filter.tsx) — 홈/마이페이지 지역 필터 드롭다운.

---

## 5. 소셜 기능 (좋아요 · 댓글 · 팔로우 · 알림)

이 기능들은 **DB 트리거**와 짝을 이룬다. API는 관계 데이터만 넣고, 카운트 갱신·알림 생성은 Postgres 트리거가 자동 처리한다. ([supabase/migrations](../supabase/migrations) 참고)

### 5.1 `GET / POST /api/likes` — 카드 좋아요
- **파일**: [src/app/api/likes/route.ts](../src/app/api/likes/route.ts)
- **GET** `?cardId=` : `{ count, liked }`(총 개수 + 내가 눌렀는지). `count`와 내 좋아요 여부를 `Promise.all`로 병렬 조회.
- **POST** `{ cardId }` : 좋아요 **토글**(있으면 삭제, 없으면 insert). 새로 누르면 `logActivity("like")`.
- **트리거 연동**: `card_likes` insert 시 `notify_on_like`가 카드 주인에게 알림 생성(본인 제외).
- **연관 UI**: [like-button.tsx](../src/components/features/like-button.tsx).

### 5.2 `GET / POST / DELETE / PATCH /api/comments` — 댓글
- **파일**: [src/app/api/comments/route.ts](../src/app/api/comments/route.ts)
- **GET** `?cardId=` : 카드의 댓글 목록. 작성자 프로필 조인(이름 없으면 이메일 앞부분), 내가 좋아요한 댓글 표시, **차단한 유저(`blocked_users`)의 댓글 제거**. 대댓글은 `parent_id`로 구분.
- **POST** `{ cardId, content, parentId? }` : 댓글/대댓글 작성(1~500자). `logActivity("comment")`.
- **DELETE** `{ commentId }` : 본인 댓글 삭제.
- **PATCH** `{ commentId }` : 댓글 좋아요 토글 — DB RPC `toggle_comment_like`(insert/delete + like_count 갱신을 원자적으로).
- **트리거 연동**: 댓글 작성 시 `notify_on_comment`(카드 주인 + 부모 댓글 작성자), 댓글 좋아요 시 `notify_on_comment_like`.
- **연관 UI**: [comment-section.tsx](../src/components/features/comment-section.tsx).

### 5.3 `POST /api/comments/block` — 유저 차단 토글
- **파일**: [src/app/api/comments/block/route.ts](../src/app/api/comments/block/route.ts)
- **무엇을**: `{ blockedId }`로 `blocked_users` 토글. 차단하면 그 유저 댓글이 내 화면에서 사라짐(위 GET에서 필터). 자기 자신 차단 불가.
- **연관 UI**: [comment-section.tsx](../src/components/features/comment-section.tsx) — 댓글 옆 차단 버튼.

### 5.4 `GET / POST /api/follows` — 팔로우
- **파일**: [src/app/api/follows/route.ts](../src/app/api/follows/route.ts)
- **GET** `?userId=` : `{ follower_count, following_count, is_following }`. 카운트는 `profiles` 테이블의 캐시 컬럼에서 읽음.
- **POST** `{ targetUserId }` : 팔로우/언팔로우 토글. 자기 자신 불가. 새 팔로우면 `logActivity("follow")`.
- **트리거 연동**: `follows` insert/delete 시 `profiles.follower_count/following_count` 자동 증감, `notify_on_follow`로 알림.
- **연관 UI**: [follow-button.tsx](../src/components/features/follow-button.tsx), [my/page.tsx](../src/app/my/page.tsx)/[users/[id]/page.tsx](../src/app/users/[id]/page.tsx)의 팔로워/팔로잉 수.

### 5.5 `GET /api/follows/list` — 팔로워/팔로잉 목록
- **파일**: [src/app/api/follows/list/route.ts](../src/app/api/follows/list/route.ts)
- **무엇을**: `?userId=&type=followers|following`로 해당 목록 + 각 유저에 대해 "내가 팔로우 중인지(`is_following`)", "나 자신인지(`is_me`)" 플래그를 붙여 반환.
- **연관 UI**: [follow-list-modal.tsx](../src/components/features/follow-list-modal.tsx) — 팔로워/팔로잉 클릭 시 뜨는 모달.

### 5.6 `GET / PATCH /api/notifications` — 알림
- **파일**: [src/app/api/notifications/route.ts](../src/app/api/notifications/route.ts)
- **GET** `?limit=&offset=` : 내 알림 목록(`like|comment|follow|comment_like`). actor 프로필·카드 썸네일을 일괄 조인, `unread_count` 포함.
- **PATCH** `{ ids? }` : 읽음 처리(ids 없으면 전체 읽음).
- **트리거로 생성**: 알림 row는 API가 아니라 5.1~5.4의 DB 트리거가 만든다. `unique_notification` 제약으로 중복 방지. Supabase Realtime으로 `notifications` 테이블 구독 활성화(실시간 뱃지).
- **연관 UI**: [notification-bell.tsx](../src/components/features/notification-bell.tsx) — 헤더 종 아이콘, 미읽음 뱃지.

---

## 6. 검색

### 6.1 `GET /api/search` — 통합 검색(카드 + 사용자)
- **파일**: [src/app/api/search/route.ts](../src/app/api/search/route.ts)
- **무엇을**: 키워드 `q`로 두 가지를 검색:
  - **카드**: 주소 `ilike` DB 검색 + 최근 200개를 가져와 클라이언트단에서 태그·`shortcutMessage` 매칭 → 합집합(중복 제거) 최대 20개. 공개범위 필터 적용(팔로우 기반).
  - **사용자**: `profiles.display_name` `ilike` 매칭(본인 제외) 최대 5명.
- **응답**: `{ cards, users }`
- **연관 UI**: [search-bar.tsx](../src/components/features/search-bar.tsx) — 상단 검색바(디바운스 후 호출).

### 6.2 `GET /api/search-place` — 장소 검색 (Kakao)
- **파일**: [src/app/api/search-place/route.ts](../src/app/api/search-place/route.ts)
- **무엇을**: Kakao 키워드 검색 API로 장소명 → `{ name, address, latitude, longitude, category }` 최대 5개. **위치 정보가 없는 사진에 수동으로 위치를 붙일 때** 사용.
- **연관 UI**: [location-search.tsx](../src/components/features/location-search.tsx) — 업로드 플로우에서 위치 직접 검색·선택.

---

## 7. 문의 · 챗봇 (고객지원)

### 7.1 `GET / POST /api/support` — 문의 접수 / 내 문의 내역
- **파일**: [src/app/api/support/route.ts](../src/app/api/support/route.ts)
- **GET**: 로그인 유저의 `support_tickets` 목록(상태·관리자 답변 포함).
- **POST** `{ name, email, message }` : 문의 접수(10~2000자). 비로그인도 가능(`user_id` null 허용).
- **연관 UI**: [chatbot-panel.tsx](../src/components/features/chatbot-panel.tsx) + [chatbot-button.tsx](../src/components/features/chatbot-button.tsx) — 우하단 챗봇. FAQ([faq-data.ts](../src/lib/faq-data.ts)) 즉답 + 문의 접수/내역 확인.

---

## 8. 관리자 (Admin)

모든 관리자 API는 첫머리에서 `verifyAdmin()`(= `profiles.role === 'admin'` 확인)을 통과해야 하며, 이후 `createAdminClient()`로 RLS를 우회해 전체 데이터를 다룬다.

### 8.1 `GET / PATCH /api/admin/users` — 사용자 관리
- **파일**: [src/app/api/admin/users/route.ts](../src/app/api/admin/users/route.ts)
- **GET** `?filter=pending|suspended|dormant|withdrawn|all` : 필터별 사용자 목록. 각 유저의 이메일은 `auth.admin.getUserById`로 개별 조회해 병합.
- **PATCH** `{ userId, action, days?, reason? }` : 계정 상태 제어. `action`:
  - `approve` — 가입 승인(`is_approved=true`, `active`).
  - `reject` — 거절(= `auth.admin.deleteUser`, cascade로 profile 삭제).
  - `suspend` — 정지(`days` 있으면 기간제, null이면 영구, `reason` 저장).
  - `unsuspend` — 정지 해제.
  - `set_dormant` — 휴면 처리.
  - `restore` — 휴면/탈퇴 → 활성 복구.
  - `withdraw` — 강제 탈퇴(상태만 변경, auth는 보존).
  - **관리자 계정은 조작 불가**로 방어.
- **연관 UI**: [admin/page.tsx](../src/app/admin/page.tsx) — 사용자 관리 탭.
- **관계**: `middleware.ts`가 이 상태값들(`account_status`, `is_approved`)을 읽어 실제 접근을 통제.

### 8.2 `GET /api/admin/logs` — 활동 로그 조회
- **파일**: [src/app/api/admin/logs/route.ts](../src/app/api/admin/logs/route.ts)
- **무엇을**: `activity_logs`를 `userId`/`action`으로 필터 + 페이지네이션(`page`, `limit`≤100, `count:exact`). 로그의 유저 프로필을 별도 조인.
- **연관 UI**: [admin/page.tsx](../src/app/admin/page.tsx) — 활동 로그 탭. 데이터 소스는 [log-activity.ts](../src/lib/log-activity.ts)가 쌓은 기록.

### 8.3 `GET / PATCH /api/admin/support` — 문의 관리
- **파일**: [src/app/api/admin/support/route.ts](../src/app/api/admin/support/route.ts)
- **GET** `?status=open|answered|closed|all&page=` : 문의 목록(20개씩).
- **PATCH** `{ ticketId, admin_reply?, status? }` : 답변 작성/상태 변경. 답변을 달면 자동으로 `status='answered'` + `replied_at` 세팅.
- **연관 UI**: [admin/page.tsx](../src/app/admin/page.tsx) — 문의 관리 탭. 사용자측은 챗봇에서 답변 확인.

---

## 9. 운영 · 크론

### 9.1 `GET /api/cron/ping` — Supabase 유지 핑
- **파일**: [src/app/api/cron/ping/route.ts](../src/app/api/cron/ping/route.ts)
- **무엇을**: Supabase 무료 티어가 **비활성 시 일시정지(pause)되는 것을 방지**하려고 매일 DB에 가벼운 쿼리를 날린다. `Authorization: Bearer {CRON_SECRET}` 헤더로 보호.
- **스케줄**: [vercel.json](../vercel.json) — `0 0 * * *`(매일 자정) Vercel Cron이 호출.
- **연관**: UI 없음. 순수 운영용.

---

## 부록 A. 클라이언트 상태 관리

- **`usePhotoStore`** ([src/stores/photo-store.ts](../src/stores/photo-store.ts)) — Zustand 스토어. 업로드 플로우의 임시 상태(선택 파일·미리보기·추출 EXIF·분석결과·주소·공개범위·shareId·에러)를 단계 간 공유.
- **`useInfiniteCards`** ([src/hooks/use-infinite-cards.ts](../src/hooks/use-infinite-cards.ts)) — TanStack Query `useInfiniteQuery`로 `/api/cards` 무한스크롤(서버 상태 캐싱). CLAUDE.md 규약대로 "클라이언트 상태=Zustand, 서버 상태=TanStack Query" 구분이 여기서 드러난다.
- **`providers.tsx`** ([src/lib/providers.tsx](../src/lib/providers.tsx)) — QueryClientProvider·테마 등 전역 프로바이더.

## 부록 B. 자주 나오는 패턴(반복 학습 포인트)

1. **인증 게이트**: 거의 모든 라우트가 `const { data: { user } } = await supabase.auth.getUser(); if (!user) return 401`로 시작.
2. **커서 페이지네이션**: `limit+1`개를 가져와 초과분으로 다음 페이지 존재를 판단하고 마지막 항목의 `created_at`을 `nextCursor`로 반환. (`/api/cards`, `/api/my/liked`, `/api/users/[id]`)
3. **프로필 일괄 조회(N+1 회피)**: 목록의 `user_id`들을 모아 `profiles ... in (...)` 한 번에 조회 후 map으로 합치기.
4. **토글 API**: 좋아요·팔로우·차단은 "있으면 delete, 없으면 insert" 패턴.
5. **집계 정규화**: `comments(count)` 조인 결과 `[{count:n}]`을 숫자로 변환.
6. **DB 트리거가 하는 일**: 카운트 증감·알림 생성은 API가 아니라 Postgres 트리거. API 코드만 봐선 안 보이므로 [supabase/migrations](../supabase/migrations)를 꼭 같이 볼 것.
7. **RLS vs service_role**: 일반 라우트는 `createClient`(RLS 적용), 관리자·로그·핑은 `createAdminClient`(RLS 우회). 어느 쪽을 쓰는지가 곧 권한 경계.
