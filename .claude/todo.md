# Role: Senior Full-stack Developer (Next.js & Supabase Specialist)

# Context
나는 현재 Next.js와 Supabase(Free Tier)를 사용하여 개인 프로젝트를 구축 중이야. Vercel에 배포할 예정이며, 아래의 요구사항을 충족하는 완벽한 인증(Auth) 및 스토리지(Storage) 시스템 아키텍처와 코드를 구현해줘.

# Tech Stack
- Framework: Next.js 14+ (App Router)
- Database & Auth: Supabase
- Storage: Supabase Bucket
- Styling: Tailwind CSS
- Auth Library: @supabase/ssr (가장 최신 방식 사용)

# Requirements

## 1. Authentication (인증)
- [ ] Email & Password 회원가입 및 로그인 구현.
- [ ] 소셜 로그인(Google, Github 등) 연동을 위한 구조 설계.
- [ ] **Refresh Token 관리**: `@supabase/ssr`을 사용하여 브라우저 쿠키 기반의 세션 유지 및 자동 리프레시 로직 구현 (Middleware 활용).
- [ ] 로그아웃 및 세션 체크 로직.

## 2. Supabase Storage (사진 업로드)
- [ ] 'avatars' 또는 'user-contents'라는 이름의 Bucket 활용.
- [ ] **소유권 및 보안(RLS)**: 각 사용자는 본인이 업로드한 사진만 수정/삭제할 수 있어야 하며, public하게 읽기는 가능하거나 혹은 본인만 보게 설정할 수 있는 RLS(Row Level Security) SQL 가이드 제공.
- [ ] 이미지 업로드 API Route 또는 Server Action 구현.

## 3. Advanced Features
- [ ] API Route에서 세션을 확인하고 유저 정보를 가져오는 유틸리티 함수.
- [ ] 회원가입 시 `public.profiles` 테이블에 유저 정보를 자동으로 트리거하거나 생성하는 로직.

# Task Instruction
Claude, 다음 단계에 따라 코드를 작성해줘:

1. **Step 1: Environment Setup**: `.env.local` 설정 및 Supabase Client 설정 (`utils/supabase/` 경로에 server, client, middleware 파일 분리).
2. **Step 2: Middleware**: 모든 페이지 요청에서 세션을 체크하고 토큰을 갱신하는 `middleware.ts` 코드.
3. **Step 3: Auth Logic**: 로그인, 회원가입, 소셜 로그인 기능을 담은 Server Actions 또는 API Routes.
4. **Step 4: Storage Logic**: 파일을 버킷에 업로드하고 DB에 URL을 저장하는 로직. 이때 사용자별 폴더 구조(`user_id/filename`)를 권장해줘.
5. **Step 5: Database SQL**: `profiles` 테이블 생성 및 Storage RLS 설정을 위한 SQL 쿼리 제공.

# Output Format
- 모든 코드는 TypeScript로 작성할 것.
- 가독성을 위해 파일별로 구분하여 출력할 것.
- 보안상 주의해야 할 점(예: RLS 설정 미흡 등)을 마지막에 요약해줄 것.