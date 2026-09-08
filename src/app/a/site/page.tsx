"use client";

import { useEffect, useState } from "react";
import { Chip, SectionHead, field } from "@/components/console/glass";
import NavEditor from "@/components/console/NavEditor";
import CommunityDoorCard from "@/components/console/CommunityDoorCard";
import type { SiteConfig } from "@/lib/site-config";
import { ABOUT_VIDEOS, type AboutVideo } from "@/lib/about-content";
import { parseYoutubeInput } from "@/lib/youtube-id";

/**
 * /a/site — THE SWITCHES (TASK-129, cut 0018.06.16 a₿). One card per group:
 * the features Love can hide until they're finished, the payment rails she
 * can turn on and off, and how sessions meet. Legibility doctrine: the state
 * rides IN WORDS next to every toggle ("ON — showing" / "OFF — hidden"),
 * never color alone. Payment toggles name their env vars and say
 * configured/not — a switch can't conjure a rail whose env isn't there, so
 * an unconfigured rail's toggle greys out and says why.
 *
 * TASK-137 (0018.06.17 a₿): the meeting fields below the rail picker now
 * change WITH the rail (jitsi domain / vdo room prefix / static standing
 * link — each rail shows only its own knobs), and a new "Menu" section
 * holds the nav editor (NavEditor) — Love's own doors, no AI required.
 *
 * TASK-161 (0018.06.17 a₿ · block 966,080): a "Videos on About" card below
 * the menu — Love pastes a YouTube link (any of the usual shapes), the
 * house keeps only the 11-char id, and /about shows HER list instead of the
 * hard-coded seed. Self-contained like NavEditor (own fetch/save through
 * /api/admin/site with `{ about }`).
 *
 * TASK-162 (0018.06.17 a₿ · block 966,080): the "Community door" card beside
 * the switches — the five community-readiness probes (lib/community-
 * readiness.ts, read through /api/admin/community-readiness) in plain words,
 * and the community switch itself with the flip rule AS WORDS: "flip when
 * every row is ok", never a hard block.
 */

type RailStatus = Record<"btcpay" | "square" | "stripe", { configured: boolean; env: string[] }>;

const FEATURE_ROWS: { key: keyof SiteConfig["features"]; label: string; about: string }[] = [
  { key: "community", label: "Community", about: "the Community door in the nav, the home community section, the 11:11 Live with Love door" },
  { key: "classes", label: "Classes", about: "the Classes & rooms listing inside Community" },
  { key: "store", label: "Store", about: "the Store door in the nav and the shelf itself" },
  { key: "sessions", label: "Sessions", about: "the Sessions door in the nav and booking" },
  { key: "cuts", label: "ConsciousCuts", about: "the ConsciousCuts & Waxing door on the home's Connect row" },
  { key: "jars", label: "Tip jars", about: "the tip jars in the Support section" },
  { key: "news", label: "News & letters", about: "the News & letters door in the nav" },
];

const RAIL_ROWS: { key: keyof SiteConfig["payments"]; label: string; about: string }[] = [
  { key: "btcpay", label: "Bitcoin (BTCPay)", about: "bitcoin / lightning checkout, straight to Love's own node" },
  { key: "square", label: "Card (Square)", about: "card checkout through Square's own hosted page" },
  { key: "stripe", label: "Card (Stripe)", about: "card checkout through Stripe — the adapter isn't built yet; keys live in the Money room's key drawer" },
];

const MEETING_RAILS: { key: SiteConfig["meeting"]["rail"]; label: string; about: string }[] = [
  { key: "jitsi", label: "Jitsi", about: "sessions meet on your own Jitsi — the room opens on this site" },
  { key: "vdo", label: "VDO.Ninja", about: "sessions meet on VDO.Ninja — guest and director links on this site" },
  { key: "static", label: "Zoom / any link", about: "sessions meet at a pasted link" },
];

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
};

export default function SiteRoom() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [rails, setRails] = useState<RailStatus | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/site", { cache: "no-store" });
      if (res.status === 401) return setDenied(true);
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        setRails(data.rails);
      }
    })();
  }, []);

  async function save() {
    if (!config) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: config.features,
          payments: config.payments,
          meeting: config.meeting,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        setRails(data.rails);
        setNote("saved ✓ the site reads the switches on its next render");
      } else setNote(data.reason ?? "save failed");
    } catch {
      setNote("save failed");
    } finally {
      setBusy(false);
    }
  }

  if (denied)
    return (
      <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>
        operator session required — <a href="/a" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>sign in at the door</a>
      </p>
    );
  if (!config || !rails) return <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>reading the switches…</p>;

  const toggle = (on: boolean, disabled: boolean, label: string, onFlip: () => void) => (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      disabled={disabled}
      onClick={onFlip}
      className={`btn btn-sm ${on ? "btn-on" : "btn-ghost"}`}
      style={disabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
    >
      {on ? "ON" : "OFF"}
    </button>
  );

  return (
    <div className="p-6" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>The Switches</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        Hide what isn&apos;t finished, turn the payment types on and off. A rail is live only when its
        switch is ON <em>and</em> its keys are configured — the words under each toggle say which.
      </p>

      {/* ── the features ── */}
      <SectionHead label="Features — what the site shows" />
      {FEATURE_ROWS.map((r) => {
        const on = config.features[r.key];
        return (
          <div key={r.key} style={row}>
            {toggle(on, false, `${r.label} — currently ${on ? "on" : "off"}`, () =>
              setConfig({ ...config, features: { ...config.features, [r.key]: !on } }))}
            <div style={{ flex: 1, minWidth: 220 }}>
              <b style={{ fontSize: ".9rem" }}>{r.label}</b>
              <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — {on ? "showing" : "hidden"}: {r.about}</span>
            </div>
            <Chip tone={on ? "green" : "grey"}>{on ? "ON — showing" : "OFF — hidden"}</Chip>
          </div>
        );
      })}

      {/* ── the community door (TASK-162, 0018.06.17 a₿ · block 966,080) ──
          Beside the switches by design: the five readiness probes in plain
          words + the community switch itself with the rule as words — never
          a hard block, her call. */}
      <SectionHead label="Community door — what it needs before it opens" />
      <CommunityDoorCard />

      {/* ── the payment rails ── */}
      <SectionHead label="Payments — which rails can take money" />
      {RAIL_ROWS.map((r) => {
        const on = config.payments[r.key];
        const status = rails[r.key];
        const disabled = !status.configured;
        return (
          <div key={r.key} style={{ ...row, opacity: disabled ? 0.72 : 1 }}>
            {toggle(on && status.configured, disabled, `${r.label} — currently ${on ? "on" : "off"}`, () =>
              setConfig({ ...config, payments: { ...config.payments, [r.key]: !on } }))}
            <div style={{ flex: 1, minWidth: 220 }}>
              <b style={{ fontSize: ".9rem" }}>{r.label}</b>
              <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — {r.about}</span>
              <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 3 }}>
                {status.env.length > 0 ? (
                  <>
                    env: {status.env.map((n) => <code key={n} style={{ marginRight: 8 }}>{n}</code>)}
                    — {status.configured ? "configured ✓" : "not configured — the toggle stays dark until these are set"}
                  </>
                ) : (
                  "no env — keys are pasted in the Money room's Stripe drawer; the rail itself ships separately"
                )}
              </div>
            </div>
            <Chip tone={!status.configured ? "grey" : on ? "green" : "gold"}>
              {!status.configured ? "not configured" : on ? "ON — live" : "OFF — hidden"}
            </Chip>
          </div>
        );
      })}

      {/* ── how sessions meet ── */}
      <SectionHead label="Meetings — how sessions open" />
      <div style={row}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>The meeting rail</b>
          <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
            {" "}— new services default to this: {MEETING_RAILS.find((m) => m.key === config.meeting.rail)?.about}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MEETING_RAILS.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={config.meeting.rail === m.key}
              onClick={() => setConfig({ ...config, meeting: { ...config.meeting, rail: m.key } })}
              className={`btn btn-sm ${config.meeting.rail === m.key ? "btn-on" : "btn-ghost"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <Chip tone="lavender">rail: {config.meeting.rail}</Chip>
      </div>
      {/* TASK-137 (0018.06.17 a₿) — the fields below CHANGE WITH THE RAIL:
          "the /a/site meeting fields don't change per rail" was the
          Admiral's complaint; each rail now shows only its own knobs. The
          "Zoom / any link" toggle folds into the static block — choosing
          that rail already IS the operator's consent (site-config.ts's
          sanitize enforces allowStaticLinks:true whenever rail === "static",
          so there's nothing left to toggle separately). */}
      {config.meeting.rail === "jitsi" && (
        <div style={row}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <b style={{ fontSize: ".9rem" }}>Jitsi domain</b>
            <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — where the Jitsi rooms open; prefilled with this site&apos;s own</span>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4 }}>
              room name pattern (read-only): each session opens at <code>{config.meeting.jitsiDomain}/&lt;booking id&gt;</code> —
              the booking&apos;s own id, never a name you have to invent
            </div>
          </div>
          <input
            value={config.meeting.jitsiDomain}
            onChange={(e) => setConfig({ ...config, meeting: { ...config.meeting, jitsiDomain: e.target.value } })}
            style={{ ...field, minWidth: 260 }}
            aria-label="Jitsi domain"
          />
        </div>
      )}
      {config.meeting.rail === "vdo" && (
        <div style={row}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <b style={{ fontSize: ".9rem" }}>VDO.Ninja room prefix</b>
            <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — defaults to the site&apos;s own name</span>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4 }}>
              guests get <code>?room={config.meeting.vdoRoomPrefix || "prefix"}-&lt;booking&gt;</code> — a new session&apos;s room name starts with this prefix
            </div>
          </div>
          <input
            value={config.meeting.vdoRoomPrefix}
            onChange={(e) => setConfig({ ...config, meeting: { ...config.meeting, vdoRoomPrefix: e.target.value } })}
            style={{ ...field, minWidth: 260 }}
            aria-label="VDO.Ninja room prefix"
          />
        </div>
      )}
      {config.meeting.rail === "static" && (
        <div style={row}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <b style={{ fontSize: ".9rem" }}>Standing meeting link</b>
            <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — Zoom, Webex, anything; a new session defaults to this link</span>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4 }}>
              choosing this rail already allows &quot;any link&quot; per session — there&apos;s no separate switch to flip
            </div>
          </div>
          <input
            value={config.meeting.staticUrl}
            onChange={(e) => setConfig({ ...config, meeting: { ...config.meeting, staticUrl: e.target.value } })}
            style={{ ...field, minWidth: 260 }}
            placeholder="https://zoom.us/j/…"
            aria-label="Standing meeting link"
          />
          <Chip tone="green">any link — allowed</Chip>
        </div>
      )}

      {/* ── the menu ── */}
      <SectionHead label="Menu — the doors Love shapes" />
      <NavEditor />

      {/* ── the About playlist ── */}
      <SectionHead label="Videos on About — the playlist Love pastes" />
      <AboutVideosCard />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
        <button type="button" className="btn btn-gold btn-sm" disabled={busy} onClick={save}
          style={busy ? { opacity: 0.5 } : undefined}>
          {busy ? "Saving…" : "Save the switches"}
        </button>
        {note && <span style={{ fontSize: ".8rem", color: note.startsWith("saved") ? "var(--ok)" : "var(--err)" }}>{note}</span>}
      </div>
    </div>
  );
}

/* ── TASK-161 (0018.06.17 a₿ · block 966,080) — the About playlist card ──
   Self-contained (own fetch/save through /api/admin/site), the NavEditor
   idiom. Love pastes whatever YouTube hands her; parseYoutubeInput keeps
   only the 11-char id and refuses anything else — the refusal is said IN
   WORDS. The first row stands open on /about, the rest folded; a saved
   empty list renders the page's honest "no videos yet" line. */

const videoIconBtn: React.CSSProperties = {
  background: "none", border: "1px solid rgba(139,118,196,.35)", borderRadius: 6,
  width: 26, height: 26, cursor: "pointer", fontSize: ".8rem", lineHeight: 1, color: "var(--ink)",
};

function AboutVideosCard() {
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
