"use client";

import { useEffect, useState } from "react";
import Card from "@/components/kit/Card";
import type { SiteConfig } from "@/lib/site-config";
import type { AboutVideo } from "@/lib/about-content";
import { parseYoutubeInput } from "@/lib/youtube-id";

/**
 * TASK-496 (block 969,088+) - the REPLAYS card: AboutVideosCard's DATA flow
 * (GET /api/admin/site on mount, paste link + title, parseYoutubeInput keeps
 * only the 11-char id, a Shorts paste pre-selects portrait, add / reorder /
 * remove, ONE PUT of the whole list, a refusal said IN WORDS, a saved note
 * in words) on RoomsCard's CLASS-BASED layout (kit/Card, ul.kit-rows, one
 * state line under the words in every state, the controls on the same right
 * edge - the /a uniformity law). AboutVideosCard's own inline-style consts
 * are pre-ratchet legacy, NOT a pattern to copy: this card carries zero
 * inline style attributes.
 *
 * Unlike About, there is NO SEED behind this list: an unsaved doc and a
 * saved empty list both read as zero rows, and Save accepts an empty list
 * (the aboutPatchError({ videos: [] }) → null precedent, now
 * replaysPatchError). The public page shows its designed empty state until
 * the first paste lands here.
 *
 * Rows wear .kit-rooms-card's stacked layout (words above, the controls on
 * their own line at the same right edge) because a row here carries FOUR
 * small controls (Up, Down, the shape flip, Remove) - RoomsCard's own
 * ruled departure from one-control rows, for the same reason: several
 * controls never fit beside the words.
 */

/* T-624: ONE smart add. The site works out what a pasted link is (from the URL
   pattern, no network call), shows a preview card, and Save lives there. Saved videos are cards you drag or
   nudge with small icon buttons (the T-620 menu board's grip and moves). EVERY change saves itself, like the menu
   editor, so there is no bottom Save. A saved playlist is one card in the list with a quiet Remove. */

type Kind = "video" | "short" | "playlist";
type Found = { kind: Kind; id: string; ratio: AboutVideo["ratio"]; title: string };

const KIND_WORDS: Record<Kind, string> = { video: "A normal video", short: "A Short", playlist: "A playlist" };

function classify(raw: string): Found | null {
  const s = raw.trim();
  if (!s) return null;
  // a playlist page link, or a bare PL id (the real route probes the feed on save)
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    const list = u.searchParams.get("list");
    if (host === "youtube.com" && u.pathname.startsWith("/playlist") && list) {
      return { kind: "playlist", id: list, ratio: "16/9", title: "" };
    }
  } catch { /* not a URL: fall through */ }
  if (/^PL[A-Za-z0-9_-]{10,}$/.test(s)) return { kind: "playlist", id: s, ratio: "16/9", title: "" };
  const p = parseYoutubeInput(s);
  if (!p) return null;
  return p.likelyShort
    ? { kind: "short", id: p.id, ratio: "9/16", title: "" }
    : { kind: "video", id: p.id, ratio: "16/9", title: "" };
}

/** the frame silhouette: a wide rectangle for landscape, a tall one for portrait */
function Frame({ ratio }: { ratio: AboutVideo["ratio"] }) {
  return (
    <svg className="kit-frame-ico" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      {ratio === "9/16" ? (
        <rect x="6.5" y="2.5" width="9" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      ) : (
        <rect x="2.5" y="6.5" width="17" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      )}
    </svg>
  );
}

function Chev({ up }: { up: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={up ? "M3.5 10.5 8 6l4.5 4.5" : "M3.5 5.5 8 10l4.5-4.5"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Thumb({ id, ratio }: { id: string | null; ratio: AboutVideo["ratio"] }) {
  const [bad, setBad] = useState(false);
  return (
    <span className={`kit-rthumb${ratio === "9/16" ? " is-tall" : ""}`} aria-hidden="true">
      {id && !bad ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" onError={() => setBad(true)} />
      ) : (
        <Frame ratio={ratio} />
      )}
    </span>
  );
}

export default function ReplaysCard() {
  const [rows, setRows] = useState<AboutVideo[] | null>(null);
  const [link, setLink] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistNote, setPlaylistNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<{ i: number; mode: "before" | "after" } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/site", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;
      setRows(((data.config as SiteConfig).replays ?? []) as AboutVideo[]);
    })();
    (async () => {
      const res = await fetch("/api/admin/replays-playlist", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) setPlaylistId(data.playlist?.id ?? null);
    })();
  }, []);

  async function persist(next: AboutVideo[]) {
    setRows(next);
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replays: next }),
      });
      const data = await res.json();
      if (data.ok) { setStatus("saved"); setReason(null); }
      else { setStatus("failed"); setReason(data.reason ?? "the site would not take it"); }
    } catch {
      setStatus("failed");
      setReason("the site did not answer");
    }
  }

  function move(i: number, j: number) {
    if (!rows || j < 0 || j >= rows.length || i === j) return;
    const next = rows.slice();
    const [it] = next.splice(i, 1);
    next.splice(j, 0, it);
    void persist(next);
  }

  function smartAdd() {
    setErr(null);
    const f = classify(link);
    if (!f) {
      setFound(null);
      setErr("That does not look like a YouTube link. Paste a watch link, a youtu.be link, a Shorts link, or a playlist link.");
      return;
    }
    if (f.kind !== "playlist" && rows?.some((r) => r.id === f.id)) {
      setFound(null);
      setErr("That video is already on the list.");
      return;
    }
    setFound(f);
  }

  async function savePlaylist(clear: boolean, value: string) {
    setBusy(true);
    setPlaylistNote(null);
    try {
      const res = await fetch("/api/admin/replays-playlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist: clear ? null : value }),
      });
      const data = await res.json();
      if (data.ok) {
        setPlaylistId(data.playlist?.id ?? null);
        setPlaylistNote(clear ? "Playlist removed." : data.found > 0 ? `Playlist saved. ${data.found} videos found, newest first.` : (data.note ?? "Playlist saved, but YouTube did not answer just now."));
      } else setPlaylistNote(data.reason ?? "The playlist did not save.");
    } catch {
      setPlaylistNote("The playlist did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function saveFound() {
    if (!found) return;
    if (found.kind === "playlist") {
      await savePlaylist(false, found.id);
    } else {
      if (!found.title.trim()) {
        setErr("Give the replay a title, the words visitors see on its folded row.");
        return;
      }
      await persist([...(rows ?? []), { id: found.id, title: found.title.trim(), ratio: found.ratio }]);
    }
    setFound(null);
    setLink("");
    setErr(null);
  }

  if (!rows) return <p className="kit-note">Reading the list…</p>;

  const statusWords =
    status === "saving" ? "Saving…"
    : status === "saved" ? "Saved. The Replays page shows this list."
    : status === "failed" ? `Not saved: ${reason}. Change anything to try again.`
    : "Every change saves itself. The top card plays first on the page.";

  return (
    <Card className="kit-rooms-card kit-replays-card kit-bset">
      <div className="kit-stack kit-replays-part" data-part="add">
        <div className="kit-field">
          <label className="kit-field-label" htmlFor="replays-link">Paste a YouTube link</label>
          <div className="kit-smartadd">
            <input
              id="replays-link"
              className="kit-field-input"
              value={link}
              onChange={(e) => { setLink(e.target.value); setErr(null); setFound(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") smartAdd(); }}
              placeholder="a video, a Short or a playlist link"
              aria-label="YouTube link"
            />
            <button type="button" className="kit-btn kit-pill kit-pill-primary" onClick={smartAdd} disabled={!link.trim()}>Add</button>
          </div>
        </div>
        {err && <p className="kit-field-error">{err}</p>}

        {found && (
          <div className="kit-preview" data-part="preview">
            <Thumb id={found.kind === "playlist" ? null : found.id} ratio={found.ratio} />
            <div className="kit-preview-body">
              <b>{KIND_WORDS[found.kind]}</b>
              <span className="kit-text-quiet">
                {found.kind === "playlist"
                  ? "The page shows what is in it, newest first. YouTube shares only the latest 15."
                  : `Found ${found.id}. ${found.kind === "short" ? "A Short plays tall, so portrait is picked." : "Landscape is picked."} You can change it.`}
              </span>
              {found.kind !== "playlist" && (
                <>
                  <div className="kit-field">
                    <label className="kit-field-label" htmlFor="replays-title">Title</label>
                    <input id="replays-title" className="kit-field-input" value={found.title} placeholder="the title visitors see"
                      onChange={(e) => setFound({ ...found, title: e.target.value })} />
                  </div>
                  <div className="kit-field">
                    <span className="kit-field-label" id="replays-shape-label">Shape</span>
                    <div className="kit-shape" role="group" aria-labelledby="replays-shape-label">
                      {(["16/9", "9/16"] as const).map((r) => (
                        <button key={r} type="button" aria-pressed={found.ratio === r} onClick={() => setFound({ ...found, ratio: r })}
                          className={`kit-btn kit-pill${found.ratio === r ? " is-on" : ""}`}>
                          <Frame ratio={r} />
                          {r === "9/16" ? "Portrait" : "Landscape"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="kit-btn-row kit-preview-actions">
                <button type="button" className="kit-btn kit-pill kit-pill-primary" disabled={busy} onClick={saveFound}>Save</button>
                <button type="button" className="kit-btn kit-pill" onClick={() => { setFound(null); setErr(null); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {playlistNote && <p className="kit-note kit-note-ok" role="status">{playlistNote}</p>}
      </div>

      <div className="kit-stack kit-replays-part" data-part="list">
        <ul className="kit-rcards" aria-label="The replays list">
          {playlistId && (
            <li className="kit-rcard is-playlist" data-row="playlist">
              <Thumb id={null} ratio="16/9" />
              <span className="kit-rcard-text">
                <b>Playlist</b>
                <em>{playlistId} · newest 15 show behind your videos</em>
              </span>
              <span className="kit-rcard-ctl">
                <button type="button" className="kit-ibtn is-quiet" disabled={busy} aria-label="Remove the playlist" title="Remove" onClick={() => savePlaylist(true, "")}><Cross /></button>
              </span>
            </li>
          )}
          {rows.map((v, i) => {
            const mark = over && over.i === i && drag !== null && drag !== i ? over.mode : undefined;
            return (
              <li key={v.id} className={`kit-rcard${drag === i ? " is-dragging" : ""}`} data-row={v.id} data-drop={mark}
                onDragOver={(e) => {
                  if (drag === null) return;
                  e.preventDefault();
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setOver({ i, mode: e.clientY < r.top + r.height / 2 ? "before" : "after" });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag !== null && over) {
                    let to = over.i + (over.mode === "after" ? 1 : 0);
                    if (drag < to) to -= 1;
                    move(drag, to);
                  }
                  setDrag(null); setOver(null);
                }}>
                <span
                  className="kit-rgrip"
                  draggable
                  aria-hidden="true"
                  title={`Drag ${v.title} to move it`}
                  onDragStart={(e) => {
                    setDrag(i);
                    e.dataTransfer.effectAllowed = "move";
                    try {
                      e.dataTransfer.setData("text/plain", "replay");
                      const box = (e.currentTarget as HTMLElement).closest("li");
                      if (box) e.dataTransfer.setDragImage(box, 24, 20);
                    } catch { /* some drivers deny it */ }
                  }}
                  onDragEnd={() => { setDrag(null); setOver(null); }}
                >
                  ⠿
                </span>
                <Thumb id={v.id} ratio={v.ratio} />
                <span className="kit-rcard-text">
                  <b>{v.title}</b>
                  <em><Frame ratio={v.ratio} />{v.ratio === "9/16" ? "Portrait frame" : "Landscape frame"}</em>
                </span>
                <span className="kit-rcard-ctl">
                  <button type="button" className="kit-ibtn" disabled={i === 0} aria-label={`Move ${v.title} up`} title="Move up" onClick={() => move(i, i - 1)}><Chev up /></button>
                  <button type="button" className="kit-ibtn" disabled={i === rows.length - 1} aria-label={`Move ${v.title} down`} title="Move down" onClick={() => move(i, i + 1)}><Chev up={false} /></button>
                  <button type="button" className="kit-ibtn" aria-label={`${v.title} is ${v.ratio === "9/16" ? "portrait" : "landscape"}, press to flip the shape`}
                    title={v.ratio === "9/16" ? "Portrait, press for landscape" : "Landscape, press for portrait"}
                    onClick={() => persist(rows.map((r, idx) => (idx === i ? { ...r, ratio: r.ratio === "9/16" ? "16/9" : "9/16" } : r)))}>
                    <Frame ratio={v.ratio} />
                  </button>
                  <button type="button" className="kit-ibtn is-quiet" aria-label={`Remove ${v.title}`} title="Remove" onClick={() => persist(rows.filter((_, idx) => idx !== i))}><Cross /></button>
                </span>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && !playlistId && <p className="kit-note">Nothing here yet. Paste a link above and the Replays page fills in.</p>}
        <p className="kit-note" data-state={status} role="status" aria-live="polite">{statusWords}</p>
      </div>
    </Card>
  );
}
