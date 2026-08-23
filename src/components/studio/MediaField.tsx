"use client";

import { useEffect, useRef, useState } from "react";

/**
 * MediaField — the image field with a quiet library (Studio UI batch,
 * 2026-08-13: "manage their library… easy to navigate and not intrusive").
 * An inline expander, not a modal: current image thumb + three doors —
 * Library (thumb grid from /api/media, i.e. the git-backed uploads),
 * Upload (file → commit to the assets repo → raw URL), and a plain URL box.
 * One scroll area, capped height; the fields panel never grows a second
 * scrollbar for it.
 */

type Item = { name: string; url: string; size: number };

export default function MediaField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function connect() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenDraft.trim() }),
      });
      const d = await res.json();
      if (d.ok) {
        setTokenDraft("");
        setNote("library connected ✓");
        loadLibrary();
      } else {
        setNote(d.reason || "GitHub refused that token");
      }
    } catch {
      setNote("connection failed — try again");
    } finally {
      setBusy(false);
    }
  }

  async function loadLibrary() {
    try {
      const d = await fetch("/api/media").then((r) => r.json());
      setReady(!!d.ready);
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch {
      setReady(false);
    }
  }
  useEffect(() => { if (open) loadLibrary(); }, [open]);

  /* in-browser ConvertX: EVERY raster image becomes webp (uniform library,
     smallest files, nothing trips Vercel's ~4.5MB body ceiling — base64
     inflates by 4/3). iPhone HEIC decodes via a lazy-loaded wasm decoder.
     SVG passes through (vector); GIF passes through to keep its ANIMATION —
     canvas re-encoding would freeze it (animated-webp = a future server
     lane). */
  async function toUploadable(file: File): Promise<{ name: string; mime: string; dataBase64: string }> {
    const passthrough = file.type === "image/svg+xml" || file.type === "image/gif";
    const budget = 2.8 * 1024 * 1024; // bytes, pre-base64
    if (passthrough) {
      if (file.size > budget) throw new Error("that file is too big — keep SVG/GIF under 2.8 MB");
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      return { name: file.name, mime: file.type, dataBase64 };
    }
    /* iPhone HEIC/HEIF: browsers can't decode natively — lazy wasm decode */
    let source: Blob = file;
    const isHeic = /image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
    if (isHeic) {
      const { default: heic2any } = await import("heic2any");
      const out = await heic2any({ blob: file, toType: "image/png" }).catch(() => null);
      if (!out) throw new Error("couldn't decode that iPhone photo — try exporting it as jpg");
      source = Array.isArray(out) ? out[0] : out;
    }
    const bitmap = await createImageBitmap(source).catch(() => null);
    if (!bitmap) throw new Error("couldn't read that image format — try a jpg, png, or webp");
    const MAX_EDGE = 2000;
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const q of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", q));
      if (blob && blob.size <= budget) {
        const dataBase64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
          r.onerror = () => reject(r.error);
          r.readAsDataURL(blob);
        });
        return { name: file.name.replace(/\.[a-z0-9]+$/i, "") + ".webp", mime: "image/webp", dataBase64 };
      }
    }
    throw new Error("image is enormous even after compressing — try cropping it first");
  }

  async function upload(file: File) {
    setBusy(true);
    setNote("");
    try {
      const { name, mime, dataBase64 } = await toUploadable(file);
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mime, dataBase64 }),
      });
      const d = await res.json().catch(() => null);
      if (d?.ok && d.url) {
        onChange(d.url);
        setNote("saved to the library ✓");
        loadLibrary();
      } else {
        /* surface the REAL verdict — no more silent generic failures */
        setNote(d?.reason || `upload failed (HTTP ${res.status})`);
      }
    } catch (e) {
      setNote(e instanceof Error && e.message ? e.message : "upload failed — try again");
    } finally {
      setBusy(false);
    }
  }

  const mono = "var(--font-mono)";
  const btn: React.CSSProperties = {
    border: "1px solid var(--oc-structural-edge, rgba(139,118,196,.35))", background: "var(--puck-color-surface-subtle)", color: "var(--puck-color-text)",
    borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      {/* current image + toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{ width: 40, height: 30, borderRadius: 6, flex: "none", overflow: "hidden",
          border: "1px solid var(--oc-structural-edge, rgba(139,118,196,.35))", background: "var(--studio-mat)", display: "grid", placeItems: "center" }}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 9, color: "var(--puck-color-text-muted)" }}>—</span>
          )}
        </div>
        <span style={{ flex: 1, minWidth: 0, fontFamily: mono, fontSize: 10, color: "var(--puck-color-text-muted)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value ? value.split("/").pop() : "no image yet"}
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} style={btn}>
          {open ? "close" : "library"}
        </button>
      </div>

      {open && (
        <div style={{ border: "1px solid rgba(139,118,196,.25)", borderRadius: 10, padding: 8,
          background: "var(--puck-color-surface)", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* doors: upload + url */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button type="button" disabled={busy || ready === false} onClick={() => fileRef.current?.click()}
              style={{ ...btn, background: "#D9B24E", color: "#2b1f05" /* S2: gold law — decorative, reported */, fontWeight: 700, opacity: busy || ready === false ? 0.5 : 1 }}>
              {busy ? "uploading…" : "⇪ upload"}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            <input
              placeholder="or paste an image URL…"
              defaultValue={value?.startsWith("/") || value?.startsWith("http") ? "" : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) onChange(v);
                }
              }}
              style={{ flex: 1, minWidth: 0, background: "var(--puck-color-surface-subtle)", border: "1px solid var(--oc-field-edge, rgba(139,118,196,.3))",
                borderRadius: 8, color: "var(--puck-color-text)", fontSize: 11, padding: "5px 8px", fontFamily: mono }}
            />
          </div>

          {ready === false && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10.5, color: "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3) */, lineHeight: 1.5 }}>
                Connect the library: paste a GitHub token with access to the assets
                repo — it&apos;s checked live, saved server-side, and never shown again.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="password"
                  placeholder="github_pat_…"
                  value={tokenDraft}
                  onChange={(e) => setTokenDraft(e.target.value)}
                  autoComplete="off"
                  style={{ flex: 1, minWidth: 0, background: "var(--puck-color-surface-subtle)", border: "1px solid var(--oc-field-edge, rgba(139,118,196,.3))",
                    borderRadius: 8, color: "var(--puck-color-text)", fontSize: 11, padding: "5px 8px", fontFamily: mono }}
                />
                <button type="button" disabled={busy || !tokenDraft.trim()} onClick={connect}
                  style={{ ...btn, background: "#D9B24E", color: "#2b1f05" /* S2: gold law — decorative, reported */, fontWeight: 700,
                    opacity: busy || !tokenDraft.trim() ? 0.5 : 1 }}>
                  {busy ? "checking…" : "connect"}
                </button>
              </div>
            </div>
          )}
          {note && <div style={{ fontSize: 10.5, color: note.endsWith("✓") ? "var(--oc-ok-text, var(--ok-soft))" /* S22 B4 */ : "var(--err)" /* S2: pinned — the ruling landed (S22 B2): the literal WAS night --err */ }}>{note}</div>}

          {/* the library grid — ONE capped scroll area */}
          {items.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
              maxHeight: 168, overflowY: "auto", paddingRight: 2 }}>
              {items.map((it) => (
                <button key={it.url} type="button" title={it.name} onClick={() => { onChange(it.url); setNote(""); }}
                  style={{ padding: 0, border: value === it.url ? "2px solid var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 C1): the selected-thumb edge drinks the caveat escape (the cartridge's dawn gold ink #8A6410, 4.69 on the mat — the C1 default --gold-deep measured a hair under the 3:1 bar at 2.87, and C1's own caveat names this escape) */ : "1px solid var(--oc-field-edge, rgba(139,118,196,.3))" /* S22 D7 — same rung as the input borders above */,
                    borderRadius: 7, overflow: "hidden", cursor: "pointer", background: "var(--studio-mat)",
                    display: "flex", flexDirection: "column" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt={it.name} loading="lazy"
                    style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                  {/* the name, visible — text-safe panel per the legibility doctrine */}
                  <span style={{ display: "block", width: "100%", padding: "3px 5px", background: "var(--puck-color-surface-subtle)",
                    color: "var(--puck-color-text-secondary)", fontSize: 9.5, fontFamily: mono, textAlign: "left",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          {ready && items.length === 0 && (
            <div style={{ fontSize: 10.5, color: "var(--puck-color-text-muted)" }}>the library is empty — upload the first picture</div>
          )}
        </div>
      )}
    </div>
  );
}
