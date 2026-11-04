export function Shape({ path, className = "" }: { path?: string; className?: string }) {
  return <svg viewBox="0 0 120 86" className={`silhouette ${className}`} aria-hidden="true"><path d={path} /></svg>;
}
