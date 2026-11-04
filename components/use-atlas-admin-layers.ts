"use client";

import { useEffect, useRef, useState } from "react";
import type { LocalDivision } from "@/lib/north-america";

export function useAtlasAdminLayers(keys: string) {
  const cache = useRef<Record<string, LocalDivision[]>>({});
  const [layers, setLayers] = useState<Record<string, LocalDivision[]>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    for (const key of keys.split(",").filter(Boolean)) {
      if (cache.current[key]) continue;
      fetch(`/datasets/north-america-admin/${key}.json`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Boundary layer unavailable");
          return response.json() as Promise<LocalDivision[]>;
        })
        .then((items) => {
          if (controller.signal.aborted) return;
          cache.current[key] = items;
          setLayers((current) => ({ ...current, [key]: items }));
          setErrors((current) => current.filter((item) => item !== key));
        })
        .catch(() => {
          if (!controller.signal.aborted) setErrors((current) => [...new Set([...current, key])]);
        });
    }
    return () => controller.abort();
  }, [keys, attempt]);

  return { layers, errors, retry: () => { setErrors([]); setAttempt((current) => current + 1); } };
}
