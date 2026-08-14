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

  async function upload(file: File) {
    setBusy(true);
    setNote("");
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mime: file.type, dataBase64 }),
      });
      const d = await res.json();
      if (d.ok && d.url) {
        onChange(d.url);
        setNote("saved to the library ✓");
        loadLibrary();
      } else {
        setNote(d.reason || "upload failed");
      }
    } catch {
      setNote("upload failed — try again");
    } finally {
      setBusy(false);
    }
  }

  const mono = "ui-monospace, Menlo, Consolas, monospace";
  const btn: React.CSSProperties = {
    border: "1px solid rgba(139,118,196,.35)", background: "#1b1530", color: "#F4ECFF",
    borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      {/* current image + toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{ width: 40, height: 30, borderRadius: 6, flex: "none", overflow: "hidden",
          border: "1px solid rgba(139,118,196,.35)", background: "#0f0c1d", display: "grid", placeItems: "center" }}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 9, color: "#9a8fae" }}>—</span>
          )}
        </div>
        <span style={{ flex: 1, minWidth: 0, fontFamily: mono, fontSize: 10, color: "#9a8fae",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value ? value.split("/").pop() : "no image yet"}
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} style={btn}>
          {open ? "close" : "library"}
        </button>
      </div>

      {open && (
        <div style={{ border: "1px solid rgba(139,118,196,.25)", borderRadius: 10, padding: 8,
          background: "#12101f", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* doors: upload + url */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button type="button" disabled={busy || ready === false} onClick={() => fileRef.current?.click()}
              style={{ ...btn, background: "#D9B24E", color: "#2b1f05", fontWeight: 700, opacity: busy || ready === false ? 0.5 : 1 }}>
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
              style={{ flex: 1, minWidth: 0, background: "#1b1530", border: "1px solid rgba(139,118,196,.3)",
                borderRadius: 8, color: "#F4ECFF", fontSize: 11, padding: "5px 8px", fontFamily: mono }}
            />
          </div>

          {ready === false && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10.5, color: "#EBCB77", lineHeight: 1.5 }}>
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
                  style={{ flex: 1, minWidth: 0, background: "#1b1530", border: "1px solid rgba(139,118,196,.3)",
                    borderRadius: 8, color: "#F4ECFF", fontSize: 11, padding: "5px 8px", fontFamily: mono }}
                />
                <button type="button" disabled={busy || !tokenDraft.trim()} onClick={connect}
                  style={{ ...btn, background: "#D9B24E", color: "#2b1f05", fontWeight: 700,
                    opacity: busy || !tokenDraft.trim() ? 0.5 : 1 }}>
                  {busy ? "checking…" : "connect"}
                </button>
              </div>
            </div>
          )}
          {note && <div style={{ fontSize: 10.5, color: note.endsWith("✓") ? "#9ee0ad" : "#E7899E" }}>{note}</div>}

          {/* the library grid — ONE capped scroll area */}
          {items.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
              maxHeight: 168, overflowY: "auto", paddingRight: 2 }}>
              {items.map((it) => (
                <button key={it.url} type="button" title={it.name} onClick={() => { onChange(it.url); setNote(""); }}
                  style={{ padding: 0, border: value === it.url ? "2px solid #EBCB77" : "1px solid rgba(139,118,196,.3)",
                    borderRadius: 7, overflow: "hidden", cursor: "pointer", background: "#0f0c1d", aspectRatio: "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt={it.name} loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
          {ready && items.length === 0 && (
            <div style={{ fontSize: 10.5, color: "#9a8fae" }}>the library is empty — upload the first picture</div>
          )}
        </div>
      )}
    </div>
  );
}
