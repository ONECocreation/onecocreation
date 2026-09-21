"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { signInDoorLine, signInDoorHref, packageDoorLine } from "@/lib/room-access";

/**
 * THE ROOM, WORN IN HER BRAND (C4, mockups 2–3 blessed 0018.05.14): the
 * timeline, the hearts, the composer — straight against the homeserver's
 * client API with the member's own token from /api/matrix/login. Love's
 * messages wear the gold wash; the room always knows its teacher.
 *
 * Every message wears its SENDER's own name (T-133, 0018.06.17 a₿): the
 * homeserver's display name, the localpart as fallback — never a guessed
 * label. The old TEACHERS lookup printed any house account as "Love ✦",
 * which is how the Admiral's own words came out under her name.
 *
 * Messages from encrypted apps render as an honest lock — the fork the
 * Admiral holds: re-mint the rooms plaintext (invite-only on her own
 * non-federated server IS the privacy) or ship wasm crypto later.
 */

interface Msg {
  id: string;
  sender: string;
  name: string;
  body: string;
  ts: number;
  encrypted: boolean;
}

interface Props {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
}

/* House accounts (Love herself, the bot seat) keep the gold wash — styling
   keyed on the real sender mxid, never a stand-in name on the label. */
const TEACHERS = new Set(["adminpacman", "love", "onecocreation"]);

const AVA_GRADIENTS = [
  "linear-gradient(135deg,var(--lavender-soft),var(--lavender))",
  "linear-gradient(135deg,var(--rose-soft),var(--rose))",
  "linear-gradient(135deg,var(--room-gold-soft),var(--room-gold))",
  "linear-gradient(135deg,var(--room-teal-soft),var(--room-teal))",
];
const TEACHER_GRADIENT = "linear-gradient(135deg,#ebcb77,#b4862b)";

const localOf = (mxid: string) => mxid.slice(1, mxid.indexOf(":"));
const avaOf = (sender: string) => {
  const local = localOf(sender);
  if (TEACHERS.has(local)) return TEACHER_GRADIENT;
  let h = 0;
  for (const c of local) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVA_GRADIENTS[h % AVA_GRADIENTS.length];
};

/* TASK-247 (0018.06.23 a₿ · block ~966,922, the Admiral via Love's call: the
   emote button sat centre-text; most social sites keep it bottom-right, and
   "different colour hearts are always nice") — the corner picker, 12 in the
   order the Admiral asked for (coloured hearts first). Exported so the
   picker's exact membership+order is a direct pin, not a rendered guess. */
export const REACTION_EMOJIS: { key: string; name: string }[] = [
  { key: "❤️", name: "red heart" },
  { key: "🧡", name: "orange heart" },
  { key: "💛", name: "yellow heart" },
  { key: "💚", name: "green heart" },
  { key: "💙", name: "blue heart" },
  { key: "💜", name: "purple heart" },
  { key: "🤍", name: "white heart" },
  { key: "🩷", name: "pink heart" },
  { key: "✨", name: "sparkles" },
  { key: "🙏", name: "pray" },
  { key: "😊", name: "smile" },
  { key: "🔥", name: "fire" },
];

type TimelineEvent = {
  type: string; event_id: string; sender: string; origin_server_ts: number;
  content?: { body?: string; msgtype?: string; ["m.relates_to"]?: { rel_type?: string; event_id?: string; key?: string } };
};

export interface ParsedTimeline {
  msgs: Msg[];
  reactions: Record<string, Record<string, number>>;
  myReactions: Record<string, Set<string>>;
}

/** the timeline reader's pure core: turns one homeserver chunk into
 *  messages + a reactions map keyed by event id then by emoji key — every
 *  `m.annotation` counts now, not just a hardcoded "❤️", so a legacy
 *  ❤️-only event from before this lane still counts under the new map.
 *  Exported so the counting rule is a direct pin, not a rendered guess. */
export function parseTimelineChunk(chunk: TimelineEvent[], myUserId?: string): ParsedTimeline {
  const msgs: Msg[] = [];
  const reactions: Record<string, Record<string, number>> = {};
  const myReactions: Record<string, Set<string>> = {};
  for (const e of chunk) {
    if (e.type === "m.room.message" && e.content?.body) {
      msgs.push({
        id: e.event_id, sender: e.sender, name: localOf(e.sender),
        body: e.content.body, ts: e.origin_server_ts, encrypted: false,
      });
    } else if (e.type === "m.room.encrypted") {
      msgs.push({
        id: e.event_id, sender: e.sender, name: localOf(e.sender),
        body: "", ts: e.origin_server_ts, encrypted: true,
      });
    } else if (e.type === "m.reaction") {
      const rel = e.content?.["m.relates_to"];
      if (rel?.rel_type === "m.annotation" && rel.event_id && rel.key) {
        const forEvent = reactions[rel.event_id] ?? (reactions[rel.event_id] = {});
        forEvent[rel.key] = (forEvent[rel.key] ?? 0) + 1;
        if (myUserId && e.sender === myUserId) {
          const mine = myReactions[rel.event_id] ?? (myReactions[rel.event_id] = new Set());
          mine.add(rel.key);
        }
      }
    }
  }
  msgs.reverse();
  return { msgs, reactions, myReactions };
}

/** the send path keeps the `oc<stamp>h<n>` txn-id shape untouched. */
export function reactionSendPath(roomId: string, stamp: number, n: number) {
  return `/rooms/${encodeURIComponent(roomId)}/send/m.reaction/oc${stamp}h${n}`;
}
export function reactionEventBody(eventId: string, key: string) {
  return { "m.relates_to": { rel_type: "m.annotation", event_id: eventId, key } };
}
/** once per person per key — a direct pin on the guard `react()` uses. */
export function canReact(mineForId: Set<string> | undefined, key: string): boolean {
  return !mineForId?.has(key);
}

/* TASK-380 (0018.07.02+ a₿ · block 968,047, the Admiral's production walk,
   item D4: "the reading room button should link to the top of the page not
   bottom of chat. focus on video for them.") — the messages pane no longer
   drags the PAGE down or steals focus on mount; it only ever scrolls its
   OWN scroll box, and only when this decision says to. Roughly one message
   row's worth of slack below the visible bottom (the pane's own padding +
   a single bubble), so arriving on the newest bubble — not the exact last
   pixel — still counts as "the reader is following the room". */
export const NEAR_BOTTOM_PX = 120;

/** pure distance check against the messages pane's OWN scroll box — never
 *  the window. Exported so the boundary is a direct pin, not a rendered
 *  guess. */
export function isNearBottom(scrollTop: number, clientHeight: number, scrollHeight: number, threshold: number): boolean {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}

/** the follow decision itself, pure and separate from the effect that
 *  calls it: a first population and the reader's own send always follow;
 *  otherwise only a reader already near the bottom gets carried along — a
 *  reader scrolled up into history is never yanked back down by someone
 *  else's message. */
export function shouldFollow({
  firstPopulation,
  wasNearBottom,
  ownSend,
}: {
  firstPopulation: boolean;
  wasNearBottom: boolean;
  ownSend: boolean;
}): boolean {
  return firstPopulation || ownSend || wasNearBottom;
}

/**
 * The picker's own row of buttons — pulled out so its RENDERED shape (not
 * just the REACTION_EMOJIS data array) is a direct pin: a test can render
 * this in isolation (no fetch, no session, nothing RoomView's own effects
 * need) and count the twelve `<button role="menuitem">`s straight out of
 * the markup.
 *
 * TASK-247 second pass (re-shot, coordinator caught it): a fixed CSS grid
 * of 6 columns — always two rows of six — instead of a one-row flex that
 * measured its own width off whatever ancestor was nearest. That row's
 * natural width (12 buttons wide) was wider than the message CARD it was
 * anchored to, and the messages pane's `overflowY: "auto"` computes an
 * implicit `overflow-x: auto` too (the CSS overflow spec's "the other axis
 * becomes auto" rule) — so the row's tail (🙏 😊 🔥) was silently clipped
 * at that ancestor's edge, off-screen, never reachable by any scroll a
 * viewer could find. Two rows of six is roughly HALF as wide, which fits
 * inside every message bubble in this room (even the shortest one-line
 * message is wider than six emoji), so nothing is ever clipped again —
 * verified by re-shooting all four picker-open shots after this fix (see
 * the brief's SUMMARY.md for the exact count read off each one).
 */
export function ReactionPicker({ onPick }: { onPick: (key: string) => void }) {
  return (
    <div
      role="menu"
      aria-label="react with an emoji"
      style={{
        display: "grid", gridTemplateColumns: "repeat(6, auto)", gap: 4,
        padding: "6px 8px", borderRadius: 12,
        background: "var(--glass)", border: "1px solid var(--glass-edge)",
        boxShadow: "0 8px 22px -12px rgba(5,3,16,.6)",
      }}
    >
      {REACTION_EMOJIS.map(({ key, name }) => (
        <button
          key={key}
          type="button"
          role="menuitem"
          onClick={() => onPick(key)}
          aria-label={`react with ${name}`}
          style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 3 }}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

export default function RoomView({ slug, alias, title, kind }: Props) {
  const [state, setState] = useState<"loading" | "signedout" | "locked" | "open" | "error">("loading");
  const [reason, setReason] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, Set<string>>>({});
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [who, setWho] = useState(0);
  const [names, setNames] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const session = useRef<{ hs: string; token: string; userId: string; roomId: string } | null>(null);
  const txn = useRef(0);
  const pane = useRef<HTMLDivElement>(null);
  /* three small refs that carry the follow decision's intent ACROSS
     renders without themselves triggering one (TASK-380, Build 1) — the
     scroll listener below keeps `nearBottom` current BEFORE any update
     lands; measuring it after the new content has already committed is
     the race that stops the chat from following right when the room is
     busiest. */
  const nearBottom = useRef(true);
  const firstPopulation = useRef(true);
  const ownSend = useRef(false);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const s = session.current!;
    const res = await fetch(`${s.hs}/_matrix/client/v3${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${s.token}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    });
    return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  }, []);

  const readTimeline = useCallback(async () => {
    const s = session.current;
    if (!s) return;
    /* the roster rides every poll: sender display names come from
       joined_members (the messages feed doesn't carry them), so a name set
       or changed on the homeserver shows up without a reload */
    const members = await api(`/rooms/${encodeURIComponent(s.roomId)}/joined_members`);
    if (members.status === 403) { setState("locked"); return; }
    if (members.ok) {
      const joined = (members.data.joined ?? {}) as Record<string, { display_name?: string }>;
      setWho(Object.keys(joined).length);
      const next: Record<string, string> = {};
      for (const [mxid, info] of Object.entries(joined)) {
        if (typeof info.display_name === "string" && info.display_name.trim()) next[mxid] = info.display_name;
      }
      setNames(next);
    }
    const r = await api(`/rooms/${encodeURIComponent(s.roomId)}/messages?dir=b&limit=60`);
    if (!r.ok) {
      if (r.status === 403) setState("locked");
      return;
    }
    const chunk = (r.data.chunk ?? []) as TimelineEvent[];
    const { msgs: nextMsgs, reactions: nextReactions, myReactions: mine } =
      parseTimelineChunk(chunk, session.current?.userId);
    setMsgs(nextMsgs);
    setReactions(nextReactions);
    setMyReactions(mine);
    setState("open");
  }, [api]);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    /* a room change (alias) restarts first-population semantics — the new
       room's own first population should land at the bottom too, and a
       stale "near enough to follow" read from the OLD room's scroll box
       must never leak into the new one. */
    firstPopulation.current = true;
    nearBottom.current = true;
    ownSend.current = false;
    (async () => {
      const login = await fetch("/api/matrix/login", { method: "POST" });
      if (login.status === 401) { if (live) setState("signedout"); return; }
      const auth = (await login.json().catch(() => null)) as
        | { ok?: boolean; homeserver?: string; accessToken?: string; userId?: string; reason?: string }
        | null;
      if (!auth?.ok || !auth.accessToken) {
        if (live) { setState("error"); setReason(auth?.reason ?? "the room door didn't answer"); }
        return;
      }
      session.current = { hs: auth.homeserver!, token: auth.accessToken, userId: auth.userId!, roomId: "" };
      const dir = await api(`/directory/room/${encodeURIComponent(alias)}`);
      const roomId = dir.data.room_id as string | undefined;
      if (!roomId) { if (live) { setState("error"); setReason("this room isn't on the server yet"); } return; }
      session.current.roomId = roomId;
      await readTimeline();
      timer = setInterval(readTimeline, 6000);
    })();
    return () => { live = false; if (timer) clearInterval(timer); };
  }, [alias, api, readTimeline]);

  /* keeps `nearBottom` current from the pane's OWN scroll events — this is
     the "intent captured BEFORE the update" half of the follow rule. Keyed
     on `state` (not `[]`) because the pane doesn't exist in the DOM until
     the room finishes loading (RoomView returns early below for every
     other state), so a one-time listener attached at mount would forever
     find `pane.current` null; re-running when `state` flips to "open"
     attaches it against the real element. */
  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    const onScroll = () => {
      nearBottom.current = isNearBottom(el.scrollTop, el.clientHeight, el.scrollHeight, NEAR_BOTTOM_PX);
    };
    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [state]);

  /* the follow effect itself — scrolls the messages pane's OWN box
     (`scrollTop`), never `scrollIntoView` (which walks every scrollable
     ancestor, including the window). Keyed on the NEWEST message's id, not
     `msgs.length`: the timeline is a fixed 60-event window, so a new
     message can arrive while the count stays the same (an older event
     falls off as the new one lands) — a count-keyed effect stops following
     exactly when the room is busiest. */
  const lastMsgId = msgs[msgs.length - 1]?.id;
  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    if (
      shouldFollow({
        firstPopulation: firstPopulation.current,
        wasNearBottom: nearBottom.current,
        ownSend: ownSend.current,
      })
    ) {
      el.scrollTop = el.scrollHeight;
    }
    firstPopulation.current = false;
    ownSend.current = false;
  }, [lastMsgId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    const s = session.current;
    if (!body || !s || sending) return;
    setSending(true);
    const r = await api(
      `/rooms/${encodeURIComponent(s.roomId)}/send/m.room.message/oc${Date.now()}x${txn.current++}`,
      { method: "PUT", body: JSON.stringify({ msgtype: "m.text", body }) },
    );
    if (r.ok) {
      setDraft("");
      ownSend.current = true; // the reader's own successful send is always followed, even from history
      await readTimeline();
    }
    setSending(false);
  }

  async function react(id: string, key: string, stamp: number) {
    const s = session.current;
    if (!s || !canReact(myReactions[id], key)) return;
    setMyReactions((m) => {
      const next = { ...m };
      next[id] = new Set(next[id] ?? []).add(key);
      return next;
    });
    setReactions((r) => ({ ...r, [id]: { ...(r[id] ?? {}), [key]: (r[id]?.[key] ?? 0) + 1 } }));
    setOpenPicker(null);
    await api(reactionSendPath(s.roomId, stamp, txn.current++), {
      method: "PUT",
      body: JSON.stringify(reactionEventBody(id, key)),
    });
  }

  /* the picker closes on Escape or a click outside the corner (both the
     button and its popover carry data-reaction-corner). */
  useEffect(() => {
    if (!openPicker) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenPicker(null); };
    const onClick = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest?.("[data-reaction-corner]")) setOpenPicker(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [openPicker]);

  /* ── the door states ───────────────────────────────────────────────── */
  /* TASK-174: the door words come from src/lib/room-access.ts — the ONE
     helper the Stage's video slot reads too, so the two doors can never
     disagree (additive: the states and the fetch flow are untouched). */
  if (state === "loading") return <p style={{ color: "var(--muted)" }}>opening the room…</p>;
  if (state === "signedout")
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <p style={{ margin: "0 0 12px" }}>{signInDoorLine(title)}</p>
        <Link className="btn btn-sm" href={signInDoorHref(slug)}>Sign in · join free</Link>
      </div>
    );
  if (state === "locked")
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <p style={{ margin: "0 0 6px" }}>🔒 {packageDoorLine(null)}</p>
        <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "0 0 14px" }}>
          The lock is an invitation — everything inside stays waiting for you.
        </p>
        <Link className="btn btn-sm" href="/memberships">See the memberships</Link>
      </div>
    );
  if (state === "error")
    return <p style={{ color: "var(--muted)" }}>◌ {reason} — <Link href="/classes" style={{ color: "var(--gold-deep)" }}>back to the rooms</Link></p>;

  /* ── the room ──────────────────────────────────────────────────────── */
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", borderBottom: "1px solid var(--glass-edge)", background: "var(--glass)" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", color: "#fff", fontFamily: "var(--serif)", background: kind === "class" ? TEACHER_GRADIENT : "linear-gradient(135deg,var(--rose-soft),var(--rose))" }}>
          {kind === "class" ? "✦" : "♡"}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.15rem", margin: 0, color: "var(--ink-strong)" }}>{title}</h2>
          <p style={{ color: "var(--muted)", fontSize: ".74rem", margin: 0 }}>
            {who} {who === 1 ? "soul" : "souls"} · {kind === "class" ? "Love holds the field" : "be kind, be real"}
          </p>
        </div>
      </div>

      <div ref={pane} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14, minHeight: 260, maxHeight: "56vh", overflowY: "auto" }}>
        {msgs.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
            The field is quiet — be the first to say hello. 🕊️
          </p>
        )}
        {msgs.map((m) => {
          const teacher = TEACHERS.has(localOf(m.sender));
          const label = names[m.sender] || m.name;
          return (
            <div key={m.id} style={{ display: "flex", gap: 12, maxWidth: 680 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", color: "#fff", fontFamily: "var(--serif)", background: avaOf(m.sender) }}>
                {(label[0] ?? "?").toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    /* house glass, not paper — the white bubbles wore day ink on the dark ground */
                    background: teacher ? "rgba(217,178,78,.14)" : "var(--glass)",
                    border: `1px solid ${teacher ? "rgba(217,178,78,.5)" : "var(--glass-edge)"}`,
                    borderRadius: "4px 16px 16px 16px",
                    padding: "9px 14px",
                    fontSize: ".9rem",
                    color: "var(--ink-body)",
                    boxShadow: "0 8px 22px -16px rgba(5,3,16,.6)",
                    /* TASK-247: the corner picker lives INSIDE the card now,
                       not beside it in the flex row — the Admiral's ask
                       ("most emojis on other social sites are on the right
                       bottom side of the item") */
                    position: "relative",
                  }}
                >
                  {m.encrypted ? (
                    <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
                      🔒 sent from an encrypted app — it can&apos;t be read here yet
                    </span>
                  ) : (
                    <span style={{ whiteSpace: "pre-line" }}>{m.body}</span>
                  )}
                  {/* the "from" line lives at the FOOT of the card (Admiral, comments-1) —
                      and it is always the SENDER's own name (T-133); right padding keeps
                      it clear of the corner picker so the two never overlap */}
                  <div style={{ fontSize: ".68rem", fontWeight: 700, color: teacher ? "var(--gold-deep)" : "var(--muted)", marginTop: 6, paddingRight: m.encrypted ? 0 : 34 }}>
                    {label}
                    <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: ".64rem", marginLeft: 8 }}>
                      {new Date(m.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>

                  {!m.encrypted && (
                    <div data-reaction-corner style={{ position: "absolute", right: 8, bottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      {/* existing reactions as small chips at the card's foot-right; tap = send that key (once per person per key) */}
                      {Object.entries(reactions[m.id] ?? {}).map(([key, count]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => react(m.id, key, Date.now())}
                          aria-label={`react with ${key}`}
                          style={{
                            border: "1px solid var(--glass-edge)", background: "var(--glass)", borderRadius: 999,
                            padding: "1px 6px", fontSize: ".68rem", cursor: "pointer", color: "var(--ink-body)",
                            display: "flex", alignItems: "center", gap: 3, lineHeight: 1.6,
                          }}
                        >
                          <span>{key}</span><span>{count}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOpenPicker((p) => (p === m.id ? null : m.id))}
                        aria-label="react"
                        aria-haspopup="true"
                        aria-expanded={openPicker === m.id}
                        style={{
                          width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--glass-edge)",
                          background: "var(--glass)", cursor: "pointer", display: "grid", placeItems: "center",
                          fontSize: ".78rem", padding: 0,
                          color: (myReactions[m.id]?.size ?? 0) > 0 ? "var(--rose)" : "var(--muted)",
                        }}
                      >
                        ♡
                      </button>
                    </div>
                  )}
                  {/* the popover wrapper is a SIBLING of the corner, positioned
                      off the CARD's own box (not the small corner strip) — a
                      short one-line card still clears it above itself instead
                      of overlapping the message text (data-reaction-corner on
                      this one too, so a click inside it never counts as
                      "outside" and self-closes). TWO ROWS OF SIX (ReactionPicker's
                      fixed 6-column grid), not one row of 12 — a one-row
                      12-wide row was wider than short message bubbles and got
                      silently clipped by the messages pane's implicit
                      overflow-x (re-shot and caught: see SUMMARY.md). */}
                  {!m.encrypted && openPicker === m.id && (
                    <div data-reaction-corner style={{ position: "absolute", right: 8, bottom: "calc(100% + 8px)", zIndex: 1 }}>
                      <ReactionPicker onPick={(key) => react(m.id, key, Date.now())} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 10, padding: "14px 22px 18px", borderTop: "1px solid var(--glass-edge)" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={kind === "class" ? "Write to the room…" : "Write to the field…"}
          /* paper input — literal paper ink both themes, the house input law */
          style={{ flex: 1, minWidth: 0, padding: "12px 18px", borderRadius: 999, border: "1.5px solid rgba(139,118,196,.4)", background: "rgba(255,255,255,.94)", color: "var(--field-ink)", fontSize: ".92rem" }}
        />
        <button className="btn btn-sm" type="submit" disabled={sending || !draft.trim()}>
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
