"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function RandomRegion({ slugs, children }: { slugs: string[]; children: ReactNode }) {
  const router = useRouter();
  return <button className="quiet-button" onClick={() => router.push(`/regions/${slugs[Math.floor(Math.random() * slugs.length)]}`)}>{children}</button>;
}
