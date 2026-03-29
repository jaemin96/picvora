"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Gift, Utensils, Coffee, Landmark, Star, Sparkles, Maximize2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { NearbyPlace, PhotoAnalysis, ExifData } from "@/types";
import { TagBadge } from "./tag-badge";
import { ImagePreviewModal } from "./image-preview-modal";

const KakaoMap = dynamic(
  () => import("./kakao-map").then((m) => m.KakaoMap),
  {
    ssr: false,
    loading: () => <div style={{ width: "100%", height: 240, background: "var(--muted)" }} />,
  }
);

const categoryIcon: Record<NearbyPlace["category"], React.ReactNode> = {
  restaurant: <Utensils className="h-4 w-4" />,
  cafe: <Coffee className="h-4 w-4" />,
  attraction: <Star className="h-4 w-4" />,
  landmark: <Landmark className="h-4 w-4" />,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

type ShareCard = {
  image_url: string | null;
  address: string | null;
  exif: ExifData | null;
  analysis: PhotoAnalysis;
  created_at: string;
};

export function ShareView({ card }: { card: ShareCard }) {
  const { analysis, address, exif, image_url } = card;
  const hasGps = exif?.latitude != null && exif?.longitude != null;
  const displayAddress = address ?? analysis.directions?.currentLocation ?? "현재 위치";
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-lg space-y-4"
    >
      {/* 이미지 */}
      {image_url && (
        <motion.div variants={item} className="group relative overflow-hidden rounded-2xl border border-border shadow-lg">
          <Image
            src={image_url}
            alt="공유된 사진"
            width={600}
            height={400}
            className="h-auto w-full object-cover"
            unoptimized
          />
          {/* 프리뷰 버튼 */}
          <button
            onClick={() => setPreviewOpen(true)}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/60"
            title="원본 보기"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {/* 감성 메시지 */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-highlight/10 p-6 text-center"
      >
        <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
        <p className="text-lg font-semibold text-foreground">{analysis.shortcutMessage}</p>
        <p className="mt-1 text-sm text-muted-foreground">{analysis.mood}</p>
      </motion.div>

      {/* 태그 */}
      <motion.div variants={item} className="flex flex-wrap gap-2">
        {analysis.tags.map((tag, i) => (
          <TagBadge key={`${tag.type}-${tag.label}`} tag={tag} index={i} />
        ))}
      </motion.div>

      {/* 주변 정보 */}
      {analysis.nearbyPlaces.length > 0 && (
        <motion.div variants={item} className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">주변 정보</h3>
          </div>
          <div className="space-y-3">
            {analysis.nearbyPlaces.map((place) => (
              <div key={place.name} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
                  {categoryIcon[place.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{place.name}</p>
                    {place.distance && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {place.distance}
                      </span>
                    )}
                  </div>
                  {place.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{place.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 특산물 */}
      {analysis.specialties.length > 0 && (
        <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">이 지역 명물</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.specialties.map((s) => (
              <span key={s} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {s}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* 지도 + 오는 방법 */}
      {(hasGps || analysis.directions?.howToGet) && (
        <motion.div variants={item} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Navigation className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-medium text-foreground truncate">{displayAddress}</p>
          </div>
          {hasGps && (
            <KakaoMap
              lat={exif!.latitude!}
              lng={exif!.longitude!}
              address={displayAddress}
              jsKey={process.env.NEXT_PUBLIC_KAKAO_JS_KEY!}
            />
          )}
          {analysis.directions?.howToGet && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {analysis.directions.howToGet}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>

    {/* 이미지 프리뷰 모달 */}
    {previewOpen && image_url && (
      <ImagePreviewModal
        src={image_url}
        alt="공유된 사진"
        onClose={() => setPreviewOpen(false)}
      />
    )}
    </>
  );
}
