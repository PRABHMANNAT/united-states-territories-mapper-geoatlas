"use client";

import { useId, type Ref } from "react";
import type { MapData, Region } from "@/lib/types";

export type Camera = { x: number; y: number; k: number };
export const overviewCamera: Camera = { x: 0, y: 0, k: 1 };

const labelAdjustments: Record<string, number[]> = {
  DC: [44, 15], RI: [35, -1], CT: [22, 12], NJ: [22, 5], DE: [33, 8],
  MD: [28, 15], MA: [22, -12], VT: [-10, -8], NH: [9, -13],
};

export function AtlasSvg({
  data, regions, selection = [], fills, thematic, water, labels = true, camera = overviewCamera,
  onSelect, onHover, svgRef, showScale = false, customLabels,
}: {
  data: MapData; regions: Region[]; selection?: string[]; fills?: Record<string, string>; thematic?: boolean;
  water?: boolean; labels?: boolean; camera?: Camera; onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void; svgRef?: Ref<SVGSVGElement>;
  showScale?: boolean;
  customLabels?: Record<string, string>;
}) {
  const id = useId().replaceAll(":", "");
  const scale = Math.max(50, Math.round(400 / camera.k / 50) * 50);
  const scaleWidth = (scale / data.kmPerUnit) * camera.k;
  return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" className="atlas-svg" width={data.width} height={data.height}
    viewBox={`0 0 ${data.width} ${data.height}`} tabIndex={svgRef ? 0 : undefined} role={onSelect ? "group" : "img"} aria-label="Map of U.S. states and territories">
    <defs>
      <pattern id={`${id}-grid`} width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" className="map-grid-line" fill="none" strokeWidth="0.6" /></pattern>
      {water && <clipPath id={`${id}-land`}><path d={Object.values(data.shapes).filter((shape) => shape.panel === "conus").map((shape) => shape.path).join("")}/></clipPath>}
    </defs>
    <rect width={data.width} height={data.height} className="map-background"/>
    <rect width={data.width} height={data.height} fill={`url(#${id}-grid)`} />
    <g className="map-compass" transform="translate(67 71)" aria-hidden="true">
      <circle r="19"/><path d="M0 -15L6 10L0 6L-6 10Z"/><text x="0" y="-27">N</text>
    </g>
    <text x="65" y="295" className="map-ocean" transform="rotate(-12 65 295)">PACIFIC OCEAN</text>
    <text x="803" y="274" className="map-ocean" transform="rotate(-12 803 274)">ATLANTIC OCEAN</text>
    <text x="562" y="394" className="map-ocean">GULF OF MEXICO</text>
    <g className="map-camera" transform={`translate(${camera.x} ${camera.y}) scale(${camera.k})`}>
      {data.panels.map(({ id, title, box: [x, y, width, height] }) => <g key={id}><rect x={x} y={y} width={width} height={height} rx="3" className="inset-frame"/><text x={x + 11} y={y + 16} className="inset-title">{title.toUpperCase()}</text></g>)}
      {regions.map((region) => {
        const shape = data.shapes[region.id];
        if (!shape) return null;
        const active = selection.includes(region.id);
        const [lx, ly] = shape.label;
        const [dx, dy] = labelAdjustments[region.id] ?? [0, 0];
        const callout = Boolean(dx || dy);
        return <g key={region.id} role={onSelect ? "button" : undefined} aria-pressed={onSelect ? active : undefined}
          aria-label={region.name} className={`map-region${shape.panel !== "conus" ? " inset-region" : ""}${active ? " selected" : ""}${thematic && !fills?.[region.id] ? " missing" : ""}`}
          onPointerEnter={() => onHover?.(region.id)} onPointerLeave={() => onHover?.(null)} onClick={() => onSelect?.(region.id)}>
          <title>{region.name}</title>
          {shape.hitBox && onSelect && <rect x={shape.hitBox[0]} y={shape.hitBox[1]} width={shape.hitBox[2]} height={shape.hitBox[3]} className="inset-hit-area" />}
          <path className="region-path" d={shape.path} fill={fills?.[region.id]} vectorEffect="non-scaling-stroke"/>
          {callout && labels && <path d={`M${lx} ${ly} L${lx + dx} ${ly + dy}`} className="label-leader" vectorEffect="non-scaling-stroke"/>}
          {(labels || shape.panel !== "conus" || region.id === "DC") && <text x={lx + dx} y={ly + dy} className={`region-label${labels ? "" : " map-dot"}`}>{labels ? customLabels?.[region.id] || region.id : "·"}</text>}
        </g>;
      })}
      {water && <g pointerEvents="none" aria-hidden="true">
        <g clipPath={`url(#${id}-land)`}>{data.water.filter((feature) => feature.kind === "river").map((feature, i) => <path key={i} d={feature.path} className="water-river" vectorEffect="non-scaling-stroke"/>)}</g>
        {data.water.filter((feature) => feature.kind === "lake").map((feature, i) => <path key={i} d={feature.path} className="water-lake" vectorEffect="non-scaling-stroke"/>)}
      </g>}
    </g>
    {showScale && <g className="map-scale" transform="translate(30 405)"><path d={`M0 -3v6M0 0h${scaleWidth}m0 -3v6`} /><text x="0" y="-9">≈ {scale} km</text></g>}
  </svg>;
}
