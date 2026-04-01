"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Utensils,
  Coffee,
  Landmark,
  Star,
  Navigation,
  Sparkles,
  Gift,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { PhotoAnalysis, NearbyPlace } from "@/types";
import { TagBadge } from "./tag-badge";
import { usePhotoStore } from "@/stores/photo-store";

const KakaoMap = dynamic(
  () => import("./kakao-map").then((m) => m.KakaoMap),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100%", height: 240, background: "var(--muted)" }} />
    ),
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

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function ResultCard({ analysis }: { analysis: PhotoAnalysis }) {
  const { extractedExif, address } = usePhotoStore();
  const hasGps =
    extractedExif?.latitude != null && extractedExif?.longitude != null;
  const displayAddress =
    address ?? "현재 위치";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-lg space-y-4"
    >
      {/* 감성 메시지 */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-highlight/10 p-6 text-center"
      >
        <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
        <p className="text-lg font-semibold text-foreground">
          {analysis.shortcutMessage}
        </p>
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
        <motion.div
          variants={item}
          className="space-y-3 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">주변 정보</h3>
          </div>
          <div className="space-y-3">
            {analysis.nearbyPlaces.map((place) => (
              <div
                key={place.name}
                className="flex items-start gap-3 rounded-xl bg-muted/50 p-3"
              >
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
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {place.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 특산물 */}
      {analysis.specialties.length > 0 && (
        <motion.div
          variants={item}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">이 지역 명물</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.specialties.map((s) => (
              <span
                key={s}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {s}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* 카카오맵 */}
      {hasGps && (
        <motion.div
          variants={item}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Navigation className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-medium text-foreground truncate">
              {displayAddress}
            </p>
          </div>
          <KakaoMap
            lat={extractedExif!.latitude!}
            lng={extractedExif!.longitude!}
            address={displayAddress}
            jsKey={process.env.NEXT_PUBLIC_KAKAO_JS_KEY!}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
