import type { ReactNode } from "react";

export function PageHeading({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return <div className="page-heading"><p className="eyebrow">{label.replace(/^\d+\s*\/\s*/, "")}</p><h1>{title}</h1><p>{children}</p></div>;
}
