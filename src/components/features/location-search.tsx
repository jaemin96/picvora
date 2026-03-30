"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Search, X, Loader2 } from "lucide-react";

type Place = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
};

interface LocationSearchProps {
  onSelect: (place: { name: string; address: string; latitude: number; longitude: number }) => void;
  selectedPlace?: { name: string; address: string } | null;
  onClear: () => void;
}

export function LocationSearch({ onSelect, selectedPlace, onClear }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchPlaces = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search-place?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.places ?? []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchPlaces]);

  // 외부 클릭시 드롭다운 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (selectedPlace) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedPlace.name}</p>
          <p className="text-xs text-muted-foreground truncate">{selectedPlace.address}</p>
        </div>
        <button
          onClick={onClear}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 focus-within:border-primary/50 transition-colors">
        {isSearching ? (
          <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="촬영 장소를 검색해보세요"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isFocused && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {results.map((place, i) => (
            <button
              key={`${place.latitude}-${place.longitude}-${i}`}
              onClick={() => {
                onSelect(place);
                setQuery("");
                setResults([]);
                setIsFocused(false);
              }}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{place.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {place.category ? `${place.category} · ` : ""}{place.address}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
