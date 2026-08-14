"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * THE ROOM, WORN IN HER BRAND (C4, mockups 2–3 blessed 0018.05.14): the
 * timeline, the hearts, the composer — straight against the homeserver's
 * client API with the member's own token from /api/matrix/login. Love's
 * messages wear the gold wash; the room always knows its teacher.
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

const TEACHERS = new Set(["adminpacman", "love", "onecocreation"]);

const AVA_GRADIENTS = [
  "linear-gradient(135deg,#cbbbea,#8b76c4)",
  "linear-gradient(135deg,#efc6da,#c56e8b)",
  "linear-gradient(135deg,#f6e2b0,#c79433)",
  "linear-gradient(135deg,#b8dcd4,#5f9b90)",
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

export default function RoomView({ slug, alias, title, kind }: Props) {
  const [state, setState] = useState<"loading" | "signedout" | "locked" | "open" | "error">("loading");
  const [reason, setReason] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [hearts, setHearts] = useState<Record<string, number>>({});
  const [myHearts, setMyHearts] = useState<Set<string>>(new Set());
  const [who, setWho] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const session = useRef<{ hs: string; token: string; userId: string; roomId: string } | null>(null);
  const txn = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

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
    const r = await api(`/rooms/${encodeURIComponent(s.roomId)}/messages?dir=b&limit=60`);
    if (!r.ok) {
      if (r.status === 403) setState("locked");
      return;
    }
    const chunk = (r.data.chunk ?? []) as {
      type: string; event_id: string; sender: string; origin_server_ts: number;
      content?: { body?: string; msgtype?: string; ["m.relates_to"]?: { rel_type?: string; event_id?: string; key?: string } };
    }[];
    const nextMsgs: Msg[] = [];
    const nextHearts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const e of chunk) {
      if (e.type === "m.room.message" && e.content?.body) {
        nextMsgs.push({
          id: e.event_id, sender: e.sender, name: localOf(e.sender),
          body: e.content.body, ts: e.origin_server_ts, encrypted: false,
        });
      } else if (e.type === "m.room.encrypted") {
        nextMsgs.push({
          id: e.event_id, sender: e.sender, name: localOf(e.sender),
          body: "", ts: e.origin_server_ts, encrypted: true,
        });
      } else if (e.type === "m.reaction") {
        const rel = e.content?.["m.relates_to"];
        if (rel?.rel_type === "m.annotation" && rel.event_id && rel.key === "❤️") {
          nextHearts[rel.event_id] = (nextHearts[rel.event_id] ?? 0) + 1;
          if (e.sender === session.current?.userId) mine.add(rel.event_id);
        }
      }
    }
    nextMsgs.reverse();
    setMsgs(nextMsgs);
    setHearts(nextHearts);
    setMyHearts(mine);
    setState("open");
  }, [api]);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setInterval> | null = null;
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
      const members = await api(`/rooms/${encodeURIComponent(roomId)}/joined_members`);
      if (members.status === 403) { if (live) setState("locked"); return; }
      if (live) setWho(Object.keys((members.data.joined as object) ?? {}).length);
      await readTimeline();
      timer = setInterval(readTimeline, 6000);
    })();
    return () => { live = false; if (timer) clearInterval(timer); };
  }, [alias, api, readTimeline]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

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
    if (r.ok) { setDraft(""); await readTimeline(); }
    setSending(false);
  }

  async function heart(id: string) {
    const s = session.current;
    if (!s || myHearts.has(id)) return;
    setMyHearts((m) => new Set(m).add(id));
    setHearts((h) => ({ ...h, [id]: (h[id] ?? 0) + 1 }));
    await api(`/rooms/${encodeURIComponent(s.roomId)}/send/m.reaction/oc${Date.now()}h${txn.current++}`, {
      method: "PUT",
      body: JSON.stringify({ "m.relates_to": { rel_type: "m.annotation", event_id: id, key: "❤️" } }),
    });
  }

  /* ── the door states ───────────────────────────────────────────────── */
  if (state === "loading") return <p style={{ color: "var(--muted)" }}>opening the room…</p>;
  if (state === "signedout")
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <p style={{ margin: "0 0 12px" }}>This room opens for members — sign in and it knows you.</p>
        <Link className="btn btn-gold btn-sm" href="/login">Sign in · join free</Link>
      </div>
    );
  if (state === "locked")
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <p style={{ margin: "0 0 6px" }}>🔒 This door opens with a higher package.</p>
        <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "0 0 14px" }}>
          The lock is an invitation — everything inside stays waiting for you.
        </p>
        <Link className="btn btn-gold btn-sm" href="/memberships">See the memberships</Link>
      </div>
    );
  if (state === "error")
    return <p style={{ color: "var(--muted)" }}>◌ {reason} — <Link href="/classes" style={{ color: "var(--gold-deep)" }}>back to the rooms</Link></p>;

  /* ── the room ──────────────────────────────────────────────────────── */
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", borderBottom: "1px solid var(--glass-edge)", background: "var(--glass)" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", color: "#fff", fontFamily: "var(--serif)", background: kind === "class" ? TEACHER_GRADIENT : "linear-gradient(135deg,#efc6da,#c56e8b)" }}>
          {kind === "class" ? "✦" : "♡"}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.15rem", margin: 0, color: "var(--ink-strong)" }}>{title}</h2>
          <p style={{ color: "var(--muted)", fontSize: ".74rem", margin: 0 }}>
            {who} {who === 1 ? "soul" : "souls"} · {kind === "class" ? "Love holds the field" : "be kind, be real"}
          </p>
        </div>
      </div>

      <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14, minHeight: 260, maxHeight: "56vh", overflowY: "auto" }}>
        {msgs.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
            The field is quiet — be the first to say hello. 🕊️
          </p>
        )}
        {msgs.map((m) => {
          const teacher = TEACHERS.has(m.name);
          return (
            <div key={m.id} style={{ display: "flex", gap: 12, maxWidth: 680 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", color: "#fff", fontFamily: "var(--serif)", background: avaOf(m.sender) }}>
                {(teacher ? "L" : m.name[0] ?? "?").toUpperCase()}
              </div>
              <div>
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
                  }}
                >
                  {m.encrypted ? (
                    <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
                      🔒 sent from an encrypted app — it can&apos;t be read here yet
                    </span>
                  ) : (
                    <span style={{ whiteSpace: "pre-line" }}>{m.body}</span>
                  )}
                  {/* the "from" line lives at the FOOT of the card (Admiral, comments-1) */}
                  <div style={{ fontSize: ".68rem", fontWeight: 700, color: teacher ? "var(--gold-deep)" : "var(--muted)", marginTop: 6 }}>
                    {teacher ? "Love ✦" : m.name}
                    <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: ".64rem", marginLeft: 8 }}>
                      {new Date(m.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                {!m.encrypted && (
                  <button
                    onClick={() => heart(m.id)}
                    style={{
                      marginTop: 4, border: "none", background: "none", cursor: "pointer",
                      fontSize: ".76rem", color: myHearts.has(m.id) ? "var(--rose)" : "var(--muted)",
                    }}
                    aria-label="love this"
                  >
                    {myHearts.has(m.id) ? "❤️" : "♡"} {hearts[m.id] ?? ""}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 10, padding: "14px 22px 18px", borderTop: "1px solid var(--glass-edge)" }}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={kind === "class" ? "Write to the room…" : "Write to the field…"}
          /* paper input — literal paper ink both themes, the house input law */
          style={{ flex: 1, minWidth: 0, padding: "12px 18px", borderRadius: 999, border: "1.5px solid rgba(139,118,196,.4)", background: "rgba(255,255,255,.94)", color: "#4a4458", fontSize: ".92rem" }}
        />
        <button className="btn btn-gold btn-sm" type="submit" disabled={sending || !draft.trim()}>
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
