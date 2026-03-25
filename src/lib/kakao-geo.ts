/**
 * 카카오 역지오코딩: GPS 좌표 → 정확한 주소
 * 서버 전용 (REST API 키 사용)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc) return null;

    // road_address 우선, 없으면 address
    const addr = doc.road_address ?? doc.address;
    if (!addr) return null;

    return addr.address_name as string;
  } catch {
    return null;
  }
}
