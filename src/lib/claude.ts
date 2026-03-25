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
    model: "claude-haiku-4-5-20251001",
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
      "distance": "도보 N분 또는 차로 N분"
    }
  ],
  "specialties": ["이 지역/장소의 특산물이나 명물"],
  "directions": {
    "currentLocation": "현재 위치의 정확한 이름 (예: 광양 배알도 수변공원, 광양읍 중심가 등 시/군/구 단위까지 포함)",
    "howToGet": "이 장소에 오는 방법 - 대중교통(버스/기차 노선)과 자차 경로를 각각 한 줄씩"
  }
}

태그 규칙:
- mood: 사진의 감성/분위기 (예: 따뜻한, 고요한, 활기찬)
- location: 장소 관련 (예: 해변, 산, 도심)
- time: 시간대 (예: 골든아워, 새벽, 한낮)
- subject: 주요 피사체 (예: 인물, 건축물, 음식)
- specialty: 특별한 요소 (예: 벚꽃, 야경, 거리예술)

nearbyPlaces 규칙 (매우 중요):
- GPS 좌표가 있으면 반드시 해당 좌표로부터 실제 5km 이내의 장소만 추천하세요.
- 예: 광양시 GPS라면 순천, 여수, 전주 같은 다른 도시는 절대 포함하지 마세요.
- 같은 시/군 안에서, 또는 실제 도보/차로 15분 이내 거리 장소만 포함하세요.
- GPS가 없으면 사진 내용에서 추정한 도시 내 가까운 장소로 제한하세요.
- nearbyPlaces는 최대 4개, tags는 5-8개로 제한하세요.`,
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
