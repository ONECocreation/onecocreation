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

export default function ReplaysCard() {
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
      const replays = (data.config as SiteConfig).replays;
      setSavedYet(replays !== undefined);
      setRows(replays ?? []); // absent = empty: no seed stands behind this list
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
      setErr("That doesn't look like a YouTube video link. Paste the watch link, the youtu.be share link, a Shorts link, or the 11-character video id.");
      return;
    }
    if (!title.trim()) {
      setErr("The replay needs a title, the words visitors see on its folded row.");
      return;
    }
    if (rows.some((r) => r.id === parsed.id)) {
      setErr("That video is already on the list.");
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
      // `replays` is a whole-list replace (site-config.ts) - the card always
      // saves its full set, an empty list included.
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replays: rows }),
      });
      const data = await res.json();
      if (data.ok) {
        setRows(data.config.replays ?? []);
        setSavedYet(true);
        setNote("saved ✓ the Replays page reads this list on its next render");
      } else setNote(data.reason ?? "save failed");
    } catch {
      setNote("save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!rows) return <p className="kit-note">Reading the list…</p>;

  return (
    <Card className="kit-rooms-card">
      <p className="kit-text-quiet">
        Paste a YouTube link: the watch link, the youtu.be share link, or a Shorts link all work, and the house
        keeps only the video&apos;s id. The top row plays first on the page.{" "}
        {savedYet
          ? "This is your saved list: the Replays page shows exactly these."
          : "Nothing saved yet. The Replays page shows its quiet note until you save the first one."}
      </p>

      {rows.length > 0 && (
        <ul className="kit-rows" aria-label="The replays list">
          {rows.map((v, i) => (
            <li key={v.id} data-row={v.id}>
              <span>
                <b>{v.title}</b>
                <em>
                  {v.id} · {v.ratio === "9/16" ? "portrait" : "landscape"}
                </em>
              </span>
              <span className="kit-rows-end">
                <button type="button" className="kit-btn kit-btn-quiet" disabled={i === 0} aria-label={`move ${v.title} up`} onClick={() => setRows(move(rows, i, -1))}>
                  Up
                </button>
                <button type="button" className="kit-btn kit-btn-quiet" disabled={i === rows.length - 1} aria-label={`move ${v.title} down`} onClick={() => setRows(move(rows, i, 1))}>
                  Down
                </button>
                <button
                  type="button"
                  className="kit-btn kit-btn-quiet"
                  aria-label={`${v.title}, currently ${v.ratio === "9/16" ? "portrait" : "landscape"}, flip the shape`}
                  onClick={() => setRows(rows.map((r, idx) => (idx === i ? { ...r, ratio: r.ratio === "9/16" ? "16/9" : "9/16" } : r)))}
                >
                  {v.ratio === "9/16" ? "portrait" : "landscape"}
                </button>
                <button type="button" className="kit-btn kit-btn-quiet" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="kit-stack">
        <div className="kit-field">
          <label className="kit-field-label" htmlFor="replays-link">
            YouTube link
          </label>
          <input
            id="replays-link"
            className="kit-field-input"
            value={link}
            onChange={(e) => onLinkChange(e.target.value)}
            placeholder="paste the YouTube link or the video id…"
            aria-label="YouTube link or video id"
          />
        </div>
        <div className="kit-field">
          <label className="kit-field-label" htmlFor="replays-title">
            Title
          </label>
          <input
            id="replays-title"
            className="kit-field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="the title visitors see…"
            aria-label="replay title"
          />
        </div>
        <p className={`kit-note${link.trim() ? (parsed ? " kit-note-ok" : " kit-note-err") : ""}`}>
          {link.trim()
            ? parsed
              ? `id: ${parsed.id} ✓`
              : "not a YouTube video link the house knows"
            : "watch, youtu.be, Shorts, embed, or the bare 11-character id"}
        </p>
        <div className="kit-btn-row" role="group" aria-label="replay shape">
          {(["16/9", "9/16"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={ratio === r}
              onClick={() => setRatio(r)}
              className={`kit-btn kit-btn-sm ${ratio === r ? "kit-btn-main" : "kit-btn-second"}`}
            >
              {r === "9/16" ? "portrait" : "landscape"}
            </button>
          ))}
          <button type="button" className="kit-btn kit-btn-second kit-btn-sm" onClick={add}>
            + add to the list
          </button>
        </div>
        {err && <p className="kit-field-error">{err}</p>}
      </div>

      <div className="kit-btn-row">
        <button type="button" className="kit-btn kit-btn-main kit-btn-sm" disabled={busy} onClick={saveList}>
          {busy ? "Saving…" : "Save the replays"}
        </button>
      </div>
      {note && <p className={`kit-note${note.startsWith("saved") ? " kit-note-ok" : " kit-note-err"}`}>{note}</p>}
    </Card>
  );
}
