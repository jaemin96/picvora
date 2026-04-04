# Picvora

[![Picvora Thumbnail](./public/picvora-thumbnail.png)](https://picvora.vercel.app)

**촬영된 찰나를 공유하여 내 경험을 다른 사람들이 이어갈 수 있도록**

> [https://picvora.vercel.app](https://picvora.vercel.app)

사진을 업로드하면 사진에 포함된 EXIF 데이터를 활용하여 AI(Claude AI)에게 분석을 맡기고 사진의 분위기나 촬영 맥락을 분석해 감성적인 포토 카드를 자동으로 생성합니다. 카드의 내용은 사용자가 편집하거나 추가할 수 있습니다.

---

## 기능 목록

- **AI 분석** — Claude AI가 사진의 분위기, 장소, 촬영 팁 등을 자동 분석
- **EXIF 추출** — 카메라 기종, 조리개, 셔터스피드, ISO, 렌즈 정보 등 자동 파싱
- **인라인 편집** — AI 결과를 클릭해서 바로 수정, 태그 추가/삭제
- **카카오맵 연동** — 촬영 위치를 지도로 확인
- **공유 링크** — 고유 URL로 누구에게나 카드 공유 가능
- **댓글 & 좋아요** — 대댓글, 좋아요, 작성자 차단 기능
- **팔로우** — 특정 사용자 팔로잉 기능
- **다크/라이트 모드** — next-themes 기반 테마 전환
- **HEIC 지원** — iPhone 사진 포맷 자동 변환
- **Q&A** — 서비스에 대한 문의 기능 (FAQ, Q&A)

- **관리기능** - 관리자 본인만 제어 가능한 서비스로 유저나 문의 등을 관리

## 사용된 기술들

| 분류 | 기술 |
|------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, framer-motion |
| State | Zustand, TanStack Query |
| Auth & DB | Supabase (Auth, Storage, PostgreSQL) |
| AI | Anthropic Claude API |
| Image | exifr, heic2any, sharp |
| Map | KakaoMap JS SDK |

## 서비스 흐름

```
업로드 → EXIF 추출 → Claude AI 분석 → 인라인 편집 → 카드 저장 → 공유
```

1. 사진 업로드 (JPG, PNG, HEIC 지원)
2. EXIF 메타데이터 자동 추출
3. Claude AI가 분위기·장소·촬영 팁 분석
4. 결과 카드를 직접 편집
5. 게시 후 고유 링크로 공유
