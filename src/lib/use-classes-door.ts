"use client";

import { useEffect, useState } from "react";
import { classesDoor } from "@/lib/classes";

/**
 * Block 976,021: classesDoor() for client parts. It reads the switches from
 * the public half of /api/admin/site (the SiteFooter/NavMenu fetch idiom).
 * Until the read lands it gives null, so a shut room is never promised.
 */
export function useClassesDoor(): string | null {
  const [door, setDoor] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/admin/site", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d?.ok && d.config) setDoor(classesDoor(d.config)); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return door;
}
