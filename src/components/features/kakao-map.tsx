"use client";

import { useEffect, useRef } from "react";

interface KakaoMapProps {
  lat: number;
  lng: number;
  address: string;
  jsKey: string;
}

function initMap(
  container: HTMLDivElement,
  lat: number,
  lng: number,
  address: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = (window as any).kakao;
  const latlng = new k.maps.LatLng(lat, lng);
  const map = new k.maps.Map(container, { center: latlng, level: 4 });
  map.relayout();
  map.setCenter(latlng);
  const marker = new k.maps.Marker({ position: latlng });
  marker.setMap(map);
  const infoWindow = new k.maps.InfoWindow({
    content: `<div style="padding:6px 10px;font-size:13px;font-weight:600;white-space:nowrap;">${address}</div>`,
  });
  infoWindow.open(map, marker);
}

export function KakaoMap({ lat, lng, address, jsKey }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;

    // 이미 SDK 로드 완료
    if (kakao?.maps) {
      kakao.maps.load(() => initMap(container, lat, lng, address));
      return;
    }

    // 스크립트 이미 삽입 중 → 로드 완료 대기
    if (document.getElementById("kakao-map-script")) {
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const k = (window as any).kakao;
        if (k?.maps) {
          clearInterval(poll);
          k.maps.load(() => initMap(container, lat, lng, address));
        }
      }, 100);
      return () => clearInterval(poll);
    }

    // 최초 스크립트 삽입
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false`;
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).kakao.maps.load(() => initMap(container, lat, lng, address));
    };
    script.onerror = () => console.error("카카오맵 스크립트 로드 실패");
    document.head.appendChild(script);
  }, [lat, lng, address, jsKey]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: 240 }} />
  );
}
