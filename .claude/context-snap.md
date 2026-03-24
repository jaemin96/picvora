# Roadmap: Context Snap (AI 기반 장소 맥락 생성기)

## 1. Goal
- 사용자가 사진을 올리면, AI가 사진과 위치 데이터를 분석해 '장소 카드'를 자동으로 생성한다.
- 단순 정보 나열이 아닌, 감성적인 숏컷 메세지와 실질적인 유용한 정보(교통, 맛집)를 결합한다.

## 2. Core Features (MVP)
- **Image Metadata Parser**: EXIF 데이터에서 위도/경도/시간 추출.
- **AI Context Engine**: 
  - 이미지 내용 + 위치 정보를 조합해 장소의 '바이브' 파악.
  - 주변 명소, 교통편 정보 요약.
- **Dynamic UI Card**: 분석 결과에 따라 컬러 테마와 레이아웃이 변하는 결과 UI.

## 3. Tech Strategy (Cost-Effective)
- **Frontend**: Next.js 14, Lucide Icons, Framer Motion.
- **AI**: Claude 3.5 Sonnet (Vision).
- **External Data**: (개발 초기) 클로드의 내부 지식을 활용 / (심화) Google Maps API 또는 Search API 연동.