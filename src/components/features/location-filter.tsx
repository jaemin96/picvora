"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, ChevronDown, ChevronRight, X, Check, FilterX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Region = {
  name: string;
  cities: string[];
};

/** 선택된 필터 항목 */
export type LocationSelection = {
  region: string;
  city: string | null; // null이면 도/시 전체
};

type Props = {
  onFilterChange: (selections: LocationSelection[]) => void;
};

export function LocationFilter({ onFilterChange }: Props) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selections, setSelections] = useState<LocationSelection[]>([]);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/regions")
      .then((res) => res.json())
      .then((data) => setRegions(data.regions ?? []))
      .catch(() => {});
  }, []);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 특정 항목이 선택되어 있는지 확인
  const isSelected = (region: string, city: string | null) =>
    selections.some((s) => s.region === region && s.city === city);

  // 해당 도/시에 하위 선택이 있는지 (전체 or 개별 도시)
  const hasRegionSelection = (region: string) =>
    selections.some((s) => s.region === region);

  const toggleSelection = (region: string, city: string | null) => {
    setSelections((prev) => {
      let next: LocationSelection[];

      if (city === null) {
        // 도/시 전체 토글
        if (isSelected(region, null)) {
          // 도/시 전체 해제 → 해당 도/시의 모든 선택 제거
          next = prev.filter((s) => s.region !== region);
        } else {
          // 도/시 전체 선택 → 해당 도/시의 개별 도시 선택 제거 후 전체 추가
          next = [...prev.filter((s) => s.region !== region), { region, city: null }];
        }
      } else {
        // 개별 도시 토글
        if (isSelected(region, city)) {
          next = prev.filter((s) => !(s.region === region && s.city === city));
        } else {
          // 도/시 전체가 선택되어 있으면 해제하고 개별로 전환
          next = [
            ...prev.filter((s) => !(s.region === region && s.city === null)),
            { region, city },
          ];
        }
      }

      onFilterChange(next);
      return next;
    });
  };

  const removeSelection = (region: string, city: string | null) => {
    setSelections((prev) => {
      const next = prev.filter((s) => !(s.region === region && s.city === city));
      onFilterChange(next);
      return next;
    });
  };

  const clearAll = () => {
    setSelections([]);
    onFilterChange([]);
  };

  if (regions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* 트리거 버튼 */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
            selections.length > 0
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>지역 필터</span>
          {selections.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {selections.length}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {/* 드롭다운 */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
            >
              <div className="max-h-80 overflow-y-auto p-1.5">
                {regions.map((region) => {
                  const isExpanded = expandedRegion === region.name;
                  const regionChecked = isSelected(region.name, null);

                  return (
                    <div key={region.name}>
                      {/* 도/시 행 */}
                      <div className="flex items-center rounded-lg transition-colors hover:bg-muted">
                        {/* 체크박스 영역 */}
                        <button
                          onClick={() => toggleSelection(region.name, null)}
                          className="flex items-center justify-center p-2"
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                              regionChecked
                                ? "border-primary bg-primary text-primary-foreground"
                                : hasRegionSelection(region.name)
                                  ? "border-primary/50 bg-primary/20"
                                  : "border-muted-foreground/30"
                            }`}
                          >
                            {regionChecked && <Check className="h-3 w-3" />}
                            {!regionChecked && hasRegionSelection(region.name) && (
                              <div className="h-1.5 w-1.5 rounded-sm bg-primary" />
                            )}
                          </div>
                        </button>

                        {/* 도/시 이름 + 펼치기 */}
                        <button
                          onClick={() => setExpandedRegion(isExpanded ? null : region.name)}
                          className="flex flex-1 items-center justify-between py-2 pr-3 text-sm"
                        >
                          <span className={hasRegionSelection(region.name) ? "font-medium text-primary" : ""}>
                            {region.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{region.cities.length}</span>
                            <ChevronRight
                              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </div>
                        </button>
                      </div>

                      {/* 하위 시/군/구 */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            {region.cities.map((city) => {
                              const cityChecked = isSelected(region.name, city) || regionChecked;
                              return (
                                <button
                                  key={city}
                                  onClick={() => toggleSelection(region.name, city)}
                                  className="flex w-full items-center gap-2 rounded-lg py-1.5 pl-8 pr-3 text-sm transition-colors hover:bg-muted"
                                >
                                  <div
                                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                                      cityChecked
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-muted-foreground/30"
                                    }`}
                                  >
                                    {cityChecked && <Check className="h-3 w-3" />}
                                  </div>
                                  <span className={cityChecked ? "text-primary" : "text-muted-foreground"}>
                                    {city}
                                  </span>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 선택된 필터 칩 */}
      {selections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selections.map((s) => {
            const label = s.city ? `${s.region} ${s.city}` : `${s.region} 전체`;
            return (
              <motion.span
                key={`${s.region}-${s.city ?? "all"}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                <MapPin className="h-3 w-3" />
                {label}
                <button
                  onClick={() => removeSelection(s.region, s.city)}
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            );
          })}
          {selections.length > 1 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
            >
              <FilterX className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
