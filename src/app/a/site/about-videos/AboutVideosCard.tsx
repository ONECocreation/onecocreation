"use client";

import { useEffect, useState } from "react";
import { Chip, field } from "@/components/console/glass";
import type { SiteConfig } from "@/lib/site-config";
import { ABOUT_VIDEOS, type AboutVideo } from "@/lib/about-content";
import { parseYoutubeInput } from "@/lib/youtube-id";

/* ── TASK-161 (0018.06.17 a₿ · block 966,080) — the About playlist card ──
   Self-contained (own fetch/save through /api/admin/site), the NavEditor
   idiom. Love pastes whatever YouTube hands her; parseYoutubeInput keeps
   only the 11-char id and refuses anything else — the refusal is said IN
   WORDS. The first row stands open on /about, the rest folded; a saved
   empty list renders the page's honest "no videos yet" line.

   TASK-188 (0018.06.18 a₿): moved verbatim out of /a/site/page.tsx into its
   own sub-room's file — the card itself is unchanged. */

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
};

const videoIconBtn: React.CSSProperties = {
  background: "none", border: "1px solid rgba(139,118,196,.35)", borderRadius: 6,
  width: 26, height: 26, cursor: "pointer", fontSize: ".8rem", lineHeight: 1, color: "var(--ink)",
};

export default function AboutVideosCard() {
  const [rows, setRows] = useState<AboutVideo[] | null>(null);
  const [savedYet, setSavedYet] = useState(false);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [ratio, setRatio] = useState<AboutVideo["ratio"]>("16/9");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/site", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;
      const about = (data.config as SiteConfig).about;
      setSavedYet(about !== undefined);
      setRows(about?.videos ?? ABOUT_VIDEOS); // unsaved = the seed the page shows
    })();
  }, []);

  const parsed = parseYoutubeInput(link);

  function onLinkChange(v: string) {
    setLink(v);
    setErr(null);
    // a Shorts link stands portrait until Love says otherwise
    const p = parseYoutubeInput(v);
    if (p?.likelyShort) setRatio("9/16");
  }

  function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }

  function add() {
    if (!rows) return;
    setErr(null);
    if (!parsed) {
      setErr("That doesn't look like a YouTube video link — paste the watch link, the youtu.be share link, a Shorts link, or the 11-character video id.");
      return;
    }
    if (!title.trim()) {
      setErr("The video needs a title — the words visitors see on its folded row.");
      return;
    }
    if (rows.some((r) => r.id === parsed.id)) {
      setErr("That video is already in the list.");
      return;
    }
    setRows([...rows, { id: parsed.id, title: title.trim(), ratio }]);
    setLink("");
    setTitle("");
    setRatio("16/9");
  }

  async function saveList() {
    if (!rows) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about: { videos: rows } }),
      });
      const data = await res.json();
      if (data.ok) {
        setRows(data.config.about?.videos ?? []);
        setSavedYet(true);
        setNote("saved ✓ the About page reads this list on its next render");
      } else setNote(data.reason ?? "save failed");
    } catch {
      setNote("save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!rows) return <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>reading the playlist…</p>;

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: ".8rem", color: "var(--muted)", margin: "0 0 10px", maxWidth: 640 }}>
        Paste a YouTube link — the watch link, the youtu.be share link, or a Shorts link all work; the house keeps
        only the video&apos;s id. Reorder with the arrows; the first video stands open on the page, the rest folded.{" "}
        {savedYet
          ? "This is your saved list — the About page shows exactly these."
          : "This is the built-in list — the About page shows these until you save your own."}
      </p>

      {rows.length === 0 && (
        <p style={{ fontSize: ".8rem", color: "var(--muted)", margin: "0 0 10px" }}>
          The list is empty — the About page says its quiet &quot;no videos yet&quot; line until you add one.
        </p>
      )}

      {rows.map((v, i) => (
        <div key={v.id} style={row}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button type="button" style={videoIconBtn} disabled={i === 0} onClick={() => setRows(move(rows, i, -1))} aria-label={`move ${v.title} up`}>▲</button>
            <button type="button" style={videoIconBtn} disabled={i === rows.length - 1} onClick={() => setRows(move(rows, i, 1))} aria-label={`move ${v.title} down`}>▼</button>
          </span>
          <b style={{ fontSize: ".88rem", flex: 1, minWidth: 200 }}>{v.title}</b>
          <Chip tone="grey">{v.id}</Chip>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label={`${v.title} — currently ${v.ratio === "9/16" ? "portrait" : "landscape"}, flip the shape`}
            onClick={() =>
              setRows(rows.map((r, idx) => (idx === i ? { ...r, ratio: r.ratio === "9/16" ? "16/9" : "9/16" } : r)))}
          >
            {v.ratio === "9/16" ? "portrait 9/16" : "landscape 16/9"}
          </button>
          <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
            style={{ ...videoIconBtn, width: "auto", padding: "0 8px", color: "var(--err)" }}>
            remove
          </button>
        </div>
      ))}

      {/* the add row — paste, name, pick the shape */}
      <div style={{ ...row, background: "transparent", border: "1px dashed rgba(139,118,196,.3)", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 240 }}>
          <input
            value={link}
            onChange={(e) => onLinkChange(e.target.value)}
            placeholder="paste the YouTube link or the video id…"
            style={{ ...field, width: "100%" }}
            aria-label="YouTube link or video id"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="the title visitors see…"
            style={{ ...field, width: "100%" }}
            aria-label="video title"
          />
          <span style={{ fontSize: ".74rem", color: parsed ? "var(--ok)" : "var(--muted)" }}>
            {link.trim()
              ? parsed
                ? `id: ${parsed.id} ✓`
                : "not a YouTube video link the house knows"
              : "watch, youtu.be, Shorts, embed, or the bare 11-character id"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="video shape">
          {(["9/16", "16/9"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={ratio === r}
              onClick={() => setRatio(r)}
              className={`btn btn-sm ${ratio === r ? "btn-on" : "btn-ghost"}`}
            >
              {r === "9/16" ? "portrait" : "landscape"}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={add}>+ add</button>
      </div>
      {err && <p style={{ fontSize: ".8rem", color: "var(--err)", margin: "4px 0 0" }}>{err}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <button type="button" className="btn btn-gold btn-sm" disabled={busy} onClick={saveList}
          style={busy ? { opacity: 0.5 } : undefined}>
          {busy ? "Saving…" : "Save the videos"}
        </button>
        {note && <span style={{ fontSize: ".8rem", color: note.startsWith("saved") ? "var(--ok)" : "var(--err)" }}>{note}</span>}
      </div>
    </div>
  );
}
