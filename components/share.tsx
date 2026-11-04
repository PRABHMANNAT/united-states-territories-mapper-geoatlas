"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import { copyLink } from "@/lib/downloads";

export function ShareButton({ url }: { url?: () => string }) {
  const [status, setStatus] = useState("");
  return <><button className="quiet-button" onClick={async () => {
    try { await copyLink(url?.()); setStatus("Link copied"); }
    catch { setStatus("Copy the URL from your address bar"); }
  }}><Link2 size={16} /> Share</button><span role="status" className={status ? "action-status" : "sr-only"}>{status}</span></>;
}
