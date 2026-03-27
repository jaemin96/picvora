"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type InfiniteCardsFetcher<T> = (cursor: string | null, limit: number) => Promise<{
  cards: T[];
  nextCursor: string | null;
}>;

const INITIAL_SIZE = 10;
const PAGE_SIZE = 4;

export function useInfiniteCards<T>(
  fetcher: InfiniteCardsFetcher<T>,
  deps: unknown[] = []
) {
  const [cards, setCards] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const reset = useCallback(async () => {
    setLoading(true);
    setCards([]);
    cursorRef.current = null;
    try {
      const result = await fetcher(null, INITIAL_SIZE);
      setCards(result.cards);
      cursorRef.current = result.nextCursor;
      setHasMore(result.nextCursor !== null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const result = await fetcher(cursorRef.current, PAGE_SIZE);
      setCards((prev) => [...prev, ...result.cards]);
      cursorRef.current = result.nextCursor;
      setHasMore(result.nextCursor !== null);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, ...deps]);

  // 첫 로딩
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  // Intersection Observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  return { cards, loading, loadingMore, hasMore, sentinelRef, reset };
}
