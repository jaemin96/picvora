"use client";

import { useState } from "react";
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
  Plus,
  X,
  Pencil,
  Check,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { PhotoAnalysis, NearbyPlace, Tag } from "@/types";
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
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function InlineEdit({
  value,
  onSave,
  className,
  multiline,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className={`group relative cursor-pointer ${className}`}
        onClick={() => { setDraft(value); setEditing(true); }}
      >
        {value}
        <Pencil className="ml-1.5 inline h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
      </span>
    );
  }

  return (
    <span className="flex items-start gap-1">
      {multiline ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
          className={`flex-1 resize-none rounded border border-primary/50 bg-background px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary ${className}`}
          rows={3}
        />
      ) : (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className={`flex-1 rounded border border-primary/50 bg-background px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary ${className}`}
        />
      )}
      <button onClick={commit} className="mt-0.5 rounded p-0.5 text-primary hover:bg-primary/10">
        <Check className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export function EditableResultCard({
  analysis: initialAnalysis,
  onChange,
}: {
  analysis: PhotoAnalysis;
  onChange: (analysis: PhotoAnalysis) => void;
}) {
  const { extractedExif, address } = usePhotoStore();
  const analysis = initialAnalysis;
  const [addingTag, setAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");
  const [addingSpecialty, setAddingSpecialty] = useState(false);
  const [newSpecialtyValue, setNewSpecialtyValue] = useState("");

  const hasGps = extractedExif?.latitude != null && extractedExif?.longitude != null;
  const displayAddress = address ?? analysis.directions?.currentLocation ?? "현재 위치";

  const update = (partial: Partial<PhotoAnalysis>) => onChange({ ...analysis, ...partial });

  const removeTag = (index: number) =>
    update({ tags: analysis.tags.filter((_, i) => i !== index) });

  const updateTag = (index: number, label: string) => {
    const tags = [...analysis.tags];
    tags[index] = { ...tags[index], label };
    update({ tags });
  };

  const removeSpecialty = (index: number) =>
    update({ specialties: analysis.specialties.filter((_, i) => i !== index) });

  const removePlace = (index: number) =>
    update({ nearbyPlaces: analysis.nearbyPlaces.filter((_, i) => i !== index) });

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
          <InlineEdit
            value={analysis.shortcutMessage}
            onSave={(v) => update({ shortcutMessage: v })}
          />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <InlineEdit
            value={analysis.mood}
            onSave={(v) => update({ mood: v })}
          />
        </p>
      </motion.div>

      {/* 태그 */}
      <motion.div variants={item} className="flex flex-wrap gap-2 items-center">
        {analysis.tags.map((tag: Tag, i: number) => (
          <div key={`${tag.type}-${tag.label}-${i}`} className="group relative">
            <div className="cursor-pointer">
              <InlineEdit
                value={tag.label}
                onSave={(v) => updateTag(i, v)}
                className="text-xs"
              />
            </div>
            <button
              onClick={() => removeTag(i)}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {addingTag ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const label = newTagValue.trim();
              if (label) update({ tags: [...analysis.tags, { label, type: "subject" }] });
              setNewTagValue("");
              setAddingTag(false);
            }}
            className="flex items-center gap-1"
          >
            <input
              autoFocus
              value={newTagValue}
              onChange={(e) => setNewTagValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setAddingTag(false); setNewTagValue(""); } }}
              placeholder="태그 이름"
              className="w-24 rounded-full border border-primary/50 bg-background px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" className="rounded-full p-1 text-primary hover:bg-primary/10">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => { setAddingTag(false); setNewTagValue(""); }} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAddingTag(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-primary/40 px-2.5 py-1 text-xs text-primary/60 hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" /> 태그 추가
          </button>
        )}
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
            {analysis.nearbyPlaces.map((place: NearbyPlace, i: number) => (
              <div
                key={`${place.name}-${i}`}
                className="group flex items-start gap-3 rounded-xl bg-muted/50 p-3"
              >
                <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
                  {categoryIcon[place.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      <InlineEdit
                        value={place.name}
                        onSave={(v) => {
                          const places = [...analysis.nearbyPlaces];
                          places[i] = { ...places[i], name: v };
                          update({ nearbyPlaces: places });
                        }}
                      />
                    </p>
                    {place.distance && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {place.distance}
                      </span>
                    )}
                  </div>
                  {place.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <InlineEdit
                        value={place.description}
                        onSave={(v) => {
                          const places = [...analysis.nearbyPlaces];
                          places[i] = { ...places[i], description: v };
                          update({ nearbyPlaces: places });
                        }}
                      />
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removePlace(i)}
                  className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 특산물 */}
      {(analysis.specialties.length > 0) && (
        <motion.div
          variants={item}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">이 지역 명물</h3>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {analysis.specialties.map((s: string, i: number) => (
              <div key={`${s}-${i}`} className="group relative">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary inline-flex items-center gap-1">
                  <InlineEdit
                    value={s}
                    onSave={(v) => {
                      const specialties = [...analysis.specialties];
                      specialties[i] = v;
                      update({ specialties });
                    }}
                  />
                </span>
                <button
                  onClick={() => removeSpecialty(i)}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            {addingSpecialty ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const s = newSpecialtyValue.trim();
                  if (s) update({ specialties: [...analysis.specialties, s] });
                  setNewSpecialtyValue("");
                  setAddingSpecialty(false);
                }}
                className="flex items-center gap-1"
              >
                <input
                  autoFocus
                  value={newSpecialtyValue}
                  onChange={(e) => setNewSpecialtyValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setAddingSpecialty(false); setNewSpecialtyValue(""); } }}
                  placeholder="명물 이름"
                  className="w-24 rounded-full border border-primary/50 bg-background px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="submit" className="rounded-full p-1 text-primary hover:bg-primary/10">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => { setAddingSpecialty(false); setNewSpecialtyValue(""); }} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setAddingSpecialty(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-primary/40 px-2.5 py-1 text-xs text-primary/60 hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-3 w-3" /> 추가
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* 카카오맵 + 오는 방법 */}
      {(hasGps || analysis.directions?.howToGet) && (
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
          {hasGps && (
            <KakaoMap
              lat={extractedExif!.latitude!}
              lng={extractedExif!.longitude!}
              address={displayAddress}
              jsKey={process.env.NEXT_PUBLIC_KAKAO_JS_KEY!}
            />
          )}
          {analysis.directions?.howToGet && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                <InlineEdit
                  value={analysis.directions.howToGet}
                  onSave={(v) =>
                    update({
                      directions: { ...analysis.directions!, howToGet: v },
                    })
                  }
                  multiline
                />
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
