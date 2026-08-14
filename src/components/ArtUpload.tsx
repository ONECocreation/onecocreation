"use client";

import { useRef, useState } from "react";

/**
 * "Hosted on this ship" — pick an image, it lands in the fren art store
 * (/api/frens/upload, fren-session gated, 2 MB, images only), and the URL
 * flows back into the field the fren was editing. Exists so a newcomer
 * doesn't need to find an image host before they can have a face.
 */
export default function ArtUpload({
  label,
  onUrl,
}: {
  label: string;
  /** The uploaded image's URL — set it into the editor field. */
  onUrl: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/frens/upload", { method: "POST", body: form });
      let data: { ok?: boolean; url?: string; reason?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        /* non-JSON = the server fell over, not the fren */
      }
      if (!res.ok || !data?.ok || !data.url) {
        setError(data?.reason ?? `upload failed (HTTP ${res.status})`);
        return;
      }
      /* the dev driver answers a site-relative path — a kind-0 URL must be
         absolute to mean anything to other nostr apps */
      onUrl(new URL(data.url, location.origin).toString());
    } catch {
      setError("couldn't reach the ship — check your connection");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="btn-quiet" style={{ padding: "2px 0", color: "var(--teal-bright, #8FD0D8)" }}
      >
        {busy ? "Beaming up…" : `${label} `}
      </button>
      <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>hosted on this ship — up to 2 MB</span>
      {error && <span style={{ margin: 0, fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{error}</span>}
    </span>
  );
}
