export type FaqCategory = "account" | "service" | "photo" | "share" | "other";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
};

export type FaqCategoryMeta = {
  key: FaqCategory;
  label: string;
  emoji: string;
};

export const FAQ_CATEGORIES: FaqCategoryMeta[] = [
  { key: "account", label: "계정 문제", emoji: "👤" },
  { key: "service", label: "서비스 안내", emoji: "ℹ️" },
  { key: "photo", label: "사진 분석", emoji: "📷" },
  { key: "share", label: "공유 기능", emoji: "🔗" },
  { key: "other", label: "기타 문의", emoji: "💬" },
];

export const FAQ_ITEMS: FaqItem[] = [
  // 계정
  {
    id: "account-1",
    category: "account",
    question: "계정이 정지되었어요. 어떻게 하나요?",
    answer:
      "계정 정지는 서비스 이용 약관 위반 시 발생합니다. 정지 기간이 남아 있다면 해당 기간 이후 자동으로 복구됩니다. 이의가 있으시다면 '직접 문의하기'를 통해 이의 신청해 주세요.",
  },
  {
    id: "account-2",
    category: "account",
    question: "영구 정지에 이의를 제기하고 싶어요",
    answer:
      "영구 정지 이의 신청은 '직접 문의하기'를 통해 가능합니다. 이름, 가입 이메일, 이의 내용을 상세히 작성해 주시면 관리자가 검토 후 3~5 영업일 내 답변드립니다.",
  },
  {
    id: "account-3",
    category: "account",
    question: "계정이 휴면 상태로 전환되었어요",
    answer:
      "장기간(90일 이상) 미접속 시 계정이 휴면 상태로 전환됩니다. 로그인하면 즉시 활성 상태로 복구됩니다. 로그인이 되지 않는다면 아래 '직접 문의하기'로 문의해 주세요.",
  },
  {
    id: "account-4",
    category: "account",
    question: "탈퇴한 계정을 복구할 수 있나요?",
    answer:
      "탈퇴 후 30일 이내라면 관리자를 통해 복구가 가능할 수 있습니다. 아래 '직접 문의하기'를 통해 가입 이메일과 복구 요청 사유를 남겨 주세요.",
  },
  {
    id: "account-5",
    category: "account",
    question: "가입 승인이 오래 걸려요",
    answer:
      "Picvora는 관리자 승인 후 서비스를 이용할 수 있습니다. 일반적으로 1~2 영업일 내 처리됩니다. 3일 이상 대기 중이라면 '직접 문의하기'로 이메일을 남겨 주세요.",
  },

  // 서비스
  {
    id: "service-1",
    category: "service",
    question: "Picvora는 어떤 서비스인가요?",
    answer:
      "Picvora는 사진 한 장으로 그 장소의 맥락(위치, 분위기, 주변 정보)을 AI가 분석하여 손쉽게 정보 카드를 만들어 주는 AI 포토 라이프 서비스입니다.",
  },
  {
    id: "service-2",
    category: "service",
    question: "이용 요금이 있나요?",
    answer:
      "현재 Picvora는 베타 서비스로 무료로 이용할 수 있습니다. 추후 유료 플랜이 도입될 경우 사전에 공지드립니다.",
  },

  // 사진 분석
  {
    id: "photo-1",
    category: "photo",
    question: "사진 분석은 어떻게 진행되나요?",
    answer:
      "사진을 업로드하면 EXIF 데이터(촬영 위치, 카메라 정보 등)를 추출하고, Claude AI가 사진의 내용과 위치 정보를 분석하여 장소 분위기, 주변 정보, 태그 등을 자동으로 생성합니다.",
  },
  {
    id: "photo-2",
    category: "photo",
    question: "분석 결과가 부정확해요",
    answer:
      "AI 분석은 사진의 품질, GPS 정보 유무에 따라 정확도가 달라질 수 있습니다. 분석 완료 후 편집 화면에서 내용을 직접 수정할 수 있습니다. 지속적으로 부정확하다면 '직접 문의하기'로 알려주세요.",
  },
  {
    id: "photo-3",
    category: "photo",
    question: "어떤 파일 형식을 지원하나요?",
    answer:
      "JPEG, PNG, WEBP 형식의 이미지를 지원합니다. 최대 파일 크기는 10MB입니다. GPS 정보가 포함된 JPEG 파일에서 가장 정확한 분석 결과를 얻을 수 있습니다.",
  },

  // 공유
  {
    id: "share-1",
    category: "share",
    question: "카드를 외부에 공유하려면 어떻게 하나요?",
    answer:
      "카드 상세 페이지에서 공유 버튼을 누르면 고유 공유 링크가 생성됩니다. 이 링크는 로그인하지 않은 사람도 볼 수 있습니다.",
  },
  {
    id: "share-2",
    category: "share",
    question: "카드 공개 범위를 설정할 수 있나요?",
    answer:
      "현재 '전체 공개', '팔로워 공개', '나만 보기' 로 공개 범위를 설정할 수 있습니다.",
  },

  // 기타
  {
    id: "other-1",
    category: "other",
    question: "다른 사용자의 댓글을 신고하려면 어떻게 하나요?",
    answer:
      "현재 게시된 카드 자체에만 신고 기능이 있으며, 댓글 신고 기능은 추후 도입 예정입니다. 부적절한 댓글을 발견하셨다면 '댓글 숨기기' 기능을 이용해주시거나 '직접 문의하기'를 통해 해당 내용을 알려주시면 관리자가 검토합니다.",
  },
  {
    id: "other-2",
    category: "other",
    question: "개인정보는 어떻게 처리되나요?",
    answer:
      "업로드된 사진과 분석 결과는 서비스 제공 목적으로만 사용되며, 사용자가 삭제 시 즉시 제거됩니다. 상세한 내용은 개인정보처리방침을 참고해 주세요.",
  },
];

export function getFaqByCategory(category: FaqCategory): FaqItem[] {
  return FAQ_ITEMS.filter((item) => item.category === category);
}
