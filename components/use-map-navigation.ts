"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type MapView = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type Commands = {
  zoom: (factor: number) => void;
  reset: () => void;
  fit: (view: MapView) => void;
};

// Keep map geometry out of the gesture render loop. Only the SVG viewport is
// written once per animation frame; React receives the settled zoom for controls.
export function useMapNavigation(svgRef: RefObject<SVGSVGElement | null>, bounds: MapView | undefined, {
  enabled = true, minZoom = 1, maxZoom = 16, dragExclude, preserveOnResize = false,
}: { enabled?: boolean; minZoom?: number; maxZoom?: number; dragExclude?: string; preserveOnResize?: boolean } = {}) {
  const { x = 0, y = 0, width = 1, height = 1 } = bounds ?? {};
  const ready = Boolean(bounds);
  const key = `${x}:${y}:${width}:${height}:${enabled}`;
  const current = useRef<MapView | undefined>(undefined);
  const retained = useRef<{ base: MapView; view: MapView } | undefined>(undefined);
  const commands = useRef<Commands | null>(null);
  const [summary, setSummary] = useState({ key: "", zoom: 1 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !ready || !enabled) return;
    const base = { x, y, width, height };
    let view = { ...base };
    if (preserveOnResize && retained.current) {
      const previous = retained.current;
      const zoom = previous.base.width / previous.view.width;
      const cx = (previous.view.x + previous.view.width / 2 - previous.base.x) / previous.base.width;
      const cy = (previous.view.y + previous.view.height / 2 - previous.base.y) / previous.base.height;
      view = { x: x + width * cx - width / zoom / 2, y: y + height * cy - height / zoom / 2, width: width / zoom, height: height / zoom };
    }
    let frame = 0;
    let animation = 0;
    let wheelTimer = 0;
    let moved = false;
    let origin: Point | undefined;
    const pointers = new Map<number, Point>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function draw() {
      current.current = view;
      retained.current = { base, view };
      svg!.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`);
      svg!.dataset.zoom = String(width / view.width);
    }
    function publish() {
      setSummary({ key, zoom: width / view.width });
      svg!.removeAttribute("data-navigating");
    }
    function constrain(next: MapView): MapView {
      const w = Math.max(width / maxZoom, Math.min(width / minZoom, next.width));
      const h = w * height / width;
      // Keep some map visible even after a long fling or a very large wheel delta.
      return {
        x: Math.max(x - w * 0.4, Math.min(x + width - w * 0.6, next.x)),
        y: Math.max(y - h * 0.4, Math.min(y + height - h * 0.6, next.y)),
        width: w, height: h,
      };
    }
    function stopAnimation() {
      cancelAnimationFrame(animation);
      animation = 0;
    }
    function change(next: MapView) {
      view = constrain(next);
      current.current = view;
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
    }
    function animate(next: MapView) {
      stopAnimation();
      const start = { ...view };
      const target = constrain(next);
      if (reducedMotion.matches) { view = target; draw(); publish(); return; }
      const began = performance.now();
      svg!.dataset.navigating = "true";
      function tick(now: number) {
        const progress = Math.min(1, (now - began) / 180);
        const t = 1 - (1 - progress) ** 3;
        view = {
          x: start.x + (target.x - start.x) * t, y: start.y + (target.y - start.y) * t,
          width: start.width + (target.width - start.width) * t, height: start.height + (target.height - start.height) * t,
        };
        if (progress === 1) view = target;
        draw();
        if (progress < 1) animation = requestAnimationFrame(tick);
        else { animation = 0; publish(); }
      }
      animation = requestAnimationFrame(tick);
    }
    function screen(point: Point) {
      const rect = svg!.getBoundingClientRect();
      const scale = Math.min(rect.width / view.width, rect.height / view.height);
      return {
        x: view.x + (point.x - rect.left - (rect.width - view.width * scale) / 2) / scale,
        y: view.y + (point.y - rect.top - (rect.height - view.height * scale) / 2) / scale,
      };
    }
    function zoomAt(factor: number, anchor = { x: view.x + view.width / 2, y: view.y + view.height / 2 }) {
      const w = Math.max(width / maxZoom, Math.min(width / minZoom, view.width / factor));
      const ratio = w / view.width;
      return { x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio, width: w, height: view.height * ratio };
    }
    const midpoint = (points: Point[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
    const distance = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

    function down(event: PointerEvent) {
      if (event.button !== 0 || (dragExclude && (event.target as Element).closest(dragExclude))) return;
      stopAnimation();
      svg!.focus({ preventScroll: true });
      if (!pointers.size) { moved = false; origin = { x: event.clientX, y: event.clientY }; }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size > 1) moved = true;
    }
    function move(event: PointerEvent) {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const before = [...pointers.values()];
      const next = { x: event.clientX, y: event.clientY };
      // Leave normal clicks intact, including the native click target.
      if (!moved && origin && Math.hypot(next.x - origin.x, next.y - origin.y) < 5) return;
      moved = true;
      svg!.dataset.navigating = "true";
      svg!.dataset.dragging = "true";
      if (!svg!.hasPointerCapture(event.pointerId)) svg!.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, next);
      if (pointers.size > 1) {
        const after = [...pointers.values()];
        const a = screen(midpoint(before));
        const b = screen(midpoint(after));
        const scaled = zoomAt(distance(after) / Math.max(1, distance(before)), a);
        const ratio = scaled.width / view.width;
        change({ ...scaled, x: scaled.x + (a.x - b.x) * ratio, y: scaled.y + (a.y - b.y) * ratio });
      } else {
        const a = screen(previous);
        const b = screen(next);
        change({ ...view, x: view.x + a.x - b.x, y: view.y + a.y - b.y });
      }
      event.preventDefault();
    }
    function up(event: PointerEvent) {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      if (svg!.hasPointerCapture(event.pointerId)) svg!.releasePointerCapture(event.pointerId);
      if (!pointers.size) {
        svg!.removeAttribute("data-dragging");
        draw();
        publish();
      }
    }
    function lostCapture(event: PointerEvent) {
      // Touch initially captures its hit path. Moving capture to the SVG emits
      // a bubbling loss from that path; it is not the end of the gesture.
      if (event.target === svg) up(event);
    }
    function click(event: MouseEvent) {
      if (moved && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
    }
    function wheel(event: WheelEvent) {
      // Ordinary page scrolling stays available until the map is focused.
      if (document.activeElement !== svg && !svg!.contains(document.activeElement) && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      stopAnimation();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
      change(zoomAt(Math.exp(-Math.max(-120, Math.min(120, delta)) * 0.004), screen({ x: event.clientX, y: event.clientY })));
      svg!.dataset.navigating = "true";
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(publish, 130);
    }
    function keyboard(event: KeyboardEvent) {
      if (event.target !== svg) return;
      const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (direction) animate({ ...view, x: view.x + direction[0] * view.width * 0.12, y: view.y + direction[1] * view.height * 0.12 });
      else if (["+", "="].includes(event.key)) animate(zoomAt(1.4));
      else if (event.key === "-") animate(zoomAt(1 / 1.4));
      else if (["0", "Home"].includes(event.key)) animate(base);
      else return;
      event.preventDefault();
    }
    commands.current = {
      zoom: (factor) => animate(zoomAt(factor)),
      reset: () => animate(base),
      fit: (target) => {
        const w = Math.max(target.width, target.height * width / height) * 1.25;
        animate({ x: target.x + target.width / 2 - w / 2, y: target.y + target.height / 2 - w * height / width / 2, width: w, height: w * height / width });
      },
    };
    draw();
    frame = requestAnimationFrame(() => { frame = 0; draw(); publish(); });
    svg.classList.add("navigable-map");
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("lostpointercapture", lostCapture);
    svg.addEventListener("click", click, true);
    svg.addEventListener("wheel", wheel, { passive: false });
    svg.addEventListener("keydown", keyboard);
    // Finish a press even if it leaves the SVG before passing the drag threshold.
    window.addEventListener("pointerup", up);
    return () => {
      stopAnimation(); cancelAnimationFrame(frame); clearTimeout(wheelTimer);
      commands.current = null;
      svg.classList.remove("navigable-map");
      svg.removeAttribute("data-dragging"); svg.removeAttribute("data-navigating");
      svg.removeEventListener("pointerdown", down); svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up); svg.removeEventListener("pointercancel", up);
      svg.removeEventListener("lostpointercapture", lostCapture); svg.removeEventListener("click", click, true);
      svg.removeEventListener("wheel", wheel); svg.removeEventListener("keydown", keyboard);
      window.removeEventListener("pointerup", up);
    };
  }, [svgRef, x, y, width, height, ready, enabled, minZoom, maxZoom, dragExclude, preserveOnResize, key]);

  return {
    zoom: summary.key === key ? summary.zoom : 1,
    zoomBy: (factor: number) => commands.current?.zoom(factor),
    reset: () => commands.current?.reset(),
    fit: (view: MapView) => commands.current?.fit(view),
    getView: () => current.current,
  };
}
