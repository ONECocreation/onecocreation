"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload as blobDirectUpload } from "@vercel/blob/client";
import { Chip } from "@/components/console/glass";
import type { MaterialItem, MaterialKind } from "@/lib/class-materials";

/**
 * The materials shelf — Love's Desk Week/Day altitudes' "rail a" (loves-
 * desk plan). Whole panel is the drop target; items attached to the
 * current `sessionKey` surface first, everything else ("shelf — all
 * sessions") follows. Talks to /api/admin/classroom/materials (list/add/
 * attach/remove) and /api/admin/classroom/upload (bytes).
 */

const KIND_LABEL: Record<MaterialKind, string> = { recording: "recording", pdf: "pdf", file: "file" };

function safeName(name: string): string {
  const ext = (name.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "").toLowerCase();
  const base = name.toLowerCase().replace(/\.[a-z0-9]{1,8}$/i, "").replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 48);
  return `${base || "material"}${ext}`;
}

function kindForFile(file: File): MaterialKind {
  if (file.type.startsWith("audio/") || file.type.startsWith("video/")) return "recording";
  if (file.type === "application/pdf") return "pdf";
  return "file";
}

export default function MaterialsShelf({
  roomSlug,
  sessionKey,
  sessionLabel = "this session",
}: {
  roomSlug: string | null;
  /** the currently-selected session's opaque id — undefined/null means
   *  there's no active session, so every item reads as "shelf" */
  sessionKey?: string | null;
  sessionLabel?: string;
}) {
  const [items, setItems] = useState<MaterialItem[] | null>(null);
  const [blobDirect, setBlobDirect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // no guard-branch setState (react-hooks/set-state-in-effect) — the "no
  // room" render branch below checks `roomSlug` directly, so `items`
  // starting at null already means "nothing loaded yet" for that case too.
  const load = useCallback(() => {
    if (!roomSlug) return;
    fetch(`/api/admin/classroom/materials?room=${encodeURIComponent(roomSlug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) { setItems([]); return; }
        setItems(d.items ?? []);
        setBlobDirect(!!d.blobDirect);
      })
      .catch(() => setItems([]));
  }, [roomSlug]);
  useEffect(load, [load]);

  async function uploadFile(file: File) {
    if (!roomSlug) return;
    setBusy(true);
    setNote(null);
    try {
      let url: string;
      if (blobDirect) {
        const result = await blobDirectUpload(`classroom/materials/${safeName(file.name)}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/classroom/upload",
          multipart: true,
        });
        url = result.url;
      } else {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/classroom/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!data.ok) { setNote(data.reason ?? "upload failed"); return; }
        url = data.url;
      }
      const attachedTo = sessionKey ? { kind: "session" as const, sessionKey } : { kind: "shelf" as const };
      const res = await fetch("/api/admin/classroom/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomSlug, name: file.name, kind: kindForFile(file), url, attachedTo }),
      });
      const data = await res.json();
      if (!data.ok) { setNote(data.reason ?? "save failed"); return; }
      load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAttach(item: MaterialItem) {
    const attachedTo = item.attachedTo.kind === "session"
      ? { kind: "shelf" as const }
      : sessionKey
        ? { kind: "session" as const, sessionKey }
        : null;
    if (!attachedTo) return;
    await fetch("/api/admin/classroom/materials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, attachedTo }),
    }).catch(() => {});
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/classroom/materials?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  const forThis = (items ?? []).filter((m) => m.attachedTo.kind === "session" && m.attachedTo.sessionKey === sessionKey);
  const forShelf = (items ?? []).filter((m) => !(m.attachedTo.kind === "session" && m.attachedTo.sessionKey === sessionKey));

  function row(m: MaterialItem) {
    return (
      <li key={m.id} className="desk-shelf__row">
        <a href={m.url} target="_blank" rel="noreferrer" className="desk-shelf__name">{m.name}</a>
        <Chip tone="lavender">{KIND_LABEL[m.kind]}</Chip>
        {sessionKey && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleAttach(m)}>
            {m.attachedTo.kind === "session" ? `→ ${sessionLabel}` : "shelf — all sessions"}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(m.id)} title="remove">✕</button>
      </li>
    );
  }

  return (
    <div
      className={`desk-panel desk-shelf${dragging ? " desk-shelf--drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void uploadFile(file);
      }}
    >
      <div className="desk-panel__head">
        <h3>Materials</h3>
        <label className="btn btn-sm" style={{ cursor: busy || !roomSlug ? "wait" : "pointer" }}>
          {busy ? "Uploading…" : "+ upload"}
          <input
            ref={inputRef}
            type="file"
            hidden
            disabled={busy || !roomSlug}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); e.target.value = ""; }}
          />
        </label>
      </div>
      {!roomSlug && <p className="desk-panel__muted">pick a room to see its shelf</p>}
      {roomSlug && items === null && <p className="desk-panel__muted">loading…</p>}
      {roomSlug && items !== null && items.length === 0 && (
        <p className="desk-panel__muted">nothing on the shelf yet — drop a file here or press + upload</p>
      )}
      {note && <p className="desk-panel__note">{note}</p>}
      {roomSlug && items && items.length > 0 && (
        <>
          {sessionKey && forThis.length > 0 && (
            <>
              <p className="desk-shelf__label">→ {sessionLabel}</p>
              <ul className="desk-shelf__list">{forThis.map(row)}</ul>
            </>
          )}
          <p className="desk-shelf__label">shelf — all sessions</p>
          <ul className="desk-shelf__list">{forShelf.map(row)}</ul>
        </>
      )}
    </div>
  );
}
