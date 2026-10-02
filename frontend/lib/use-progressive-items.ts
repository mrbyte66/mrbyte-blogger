"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useProgressiveItems({ total, listKey, contextKey = "", limit, onLimitChange }: { total: number; listKey: string; contextKey?: string; limit?: number; onLimitChange?: (value: number) => void }) {
  const [local, setLocal] = useState({ key: listKey, count: 5 });
  if (local.key !== listKey) setLocal({ key: listKey, count: 5 });
  const visible = Math.min(limit ?? (local.key === listKey ? local.count : 5), total);
  const hasMore = visible < total;
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    const next = Math.min(visible + 5, total);
    if (onLimitChange) onLimitChange(next);
    else setLocal({ key: listKey, count: next });
  }, [visible, total, listKey, onLimitChange]);
  useEffect(() => {
    const node = sentinel.current;
    if (!hasMore || !node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { root: node.closest(".panel-scroll"), rootMargin: "0px 0px 80px 0px", threshold: .1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, contextKey]);
  return { visible, hasMore, sentinel, loadMore };
}
