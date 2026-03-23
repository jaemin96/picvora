# Coding Conventions
- **Component**: `components/` 내부에 `ui/`(원자단위)와 `features/`(기능단위)로 구분.
- **State**: 클라이언트 상태는 `Zustand` 사용, 서버 상태/데이터 페칭은 `TanStack Query` 지향.
- **Types**: `interface` 대신 `type` 키워드 사용.
- **Safety**: API 호출 시 반드시 `try-catch`와 에러 핸들링 UI(Toast)를 포함.
- **Vibe Rule**: 코드를 짜기 전, 항상 '구현 계획'을 먼저 요약해서 보고할 것.