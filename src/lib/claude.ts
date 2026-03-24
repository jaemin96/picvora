import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeImage(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  exifContext: string
) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `당신은 사진 분석 전문가입니다. 이 사진을 분석하고 아래 JSON 형식으로 응답하세요.

${exifContext}

다음 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "tags": [
    { "label": "태그이름", "type": "mood|location|time|subject|specialty" }
  ],
  "mood": "사진의 전체적인 분위기를 한 문장으로",
  "shortcutMessage": "이 장소/순간에 대한 감성적인 한줄 메시지 (20자 내외)",
  "nearbyPlaces": [
    {
      "name": "장소명",
      "category": "restaurant|cafe|attraction|landmark",
      "description": "간단 설명",
      "distance": "도보 N분"
    }
  ],
  "specialties": ["이 지역/장소의 특산물이나 명물"],
  "directions": "대중교통 접근성 한 줄 요약"
}

태그 규칙:
- mood: 사진의 감성/분위기 (예: 따뜻한, 고요한, 활기찬)
- location: 장소 관련 (예: 해변, 산, 도심)
- time: 시간대 (예: 골든아워, 새벽, 한낮)
- subject: 주요 피사체 (예: 인물, 건축물, 음식)
- specialty: 특별한 요소 (예: 벚꽃, 야경, 거리예술)

GPS 정보가 있으면 해당 위치 기반으로 주변 정보를 제공하고, 없으면 사진 내용으로 추정하세요.
nearbyPlaces는 최대 4개, tags는 5-8개로 제한하세요.`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI 응답에서 JSON을 파싱할 수 없습니다.");
  }

  return JSON.parse(jsonMatch[0]);
}
