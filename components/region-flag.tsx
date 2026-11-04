import Image from "next/image";
import type { Flag } from "@/lib/types";

export function RegionFlag({ flag, name, size = 46 }: { flag: Flag; name: string; size?: number }) {
  return <Image unoptimized src={flag.asset} alt={`Flag of ${name}`} title={`${flag.title} · ${flag.license}`} width={size}
    height={Math.round(size * flag.height / flag.width)} className="region-flag"/>;
}
