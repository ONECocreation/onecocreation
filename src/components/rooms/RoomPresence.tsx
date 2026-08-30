"use client";

import { useEffect, useState } from "react";

/**
 * Presence, honestly (loves-desk-and-classroom-plan.md, Lane ROOM): the
 * room's own `joined_members`, read with the MEMBER'S OWN token — the
 * exact two-call shape RoomView.tsx already proves (`/api/matrix/login` →
 * resolve the alias → `joined_members`). This file re-walks that same
 * small flow rather than reaching into RoomView's internals (it keeps no
 * hook of its own to reuse, and RoomView is a landed foundation this lane
 * consumes but never modifies) — the house's own convention for a screen
 * typing its own small feed rather than editing a shipped one.
 *
 * Joined ≠ online — there is no presence API anywhere in this house, so
 * this is the whole honest truth: who has joined the room, not who's
 * online right now. No invented online dots, ever.
 */

type Status = "loading" | "signedout" | "locked" | "open" | "error";

interface State {
  status: Status;
  names: string[];
}

export default function RoomPresence({ alias }: { alias: string }) {
  const [state, setState] = useState<State>({ status: "loading", names: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const login = await fetch("/api/matrix/login", { method: "POST" }).catch(() => null);
      if (!login) { if (alive) setState({ status: "error", names: [] }); return; }
      if (login.status === 401) { if (alive) setState({ status: "signedout", names: [] }); return; }
      const auth = (await login.json().catch(() => null)) as
        | { ok?: boolean; homeserver?: string; accessToken?: string }
        | null;
      if (!auth?.ok || !auth.accessToken || !auth.homeserver) { if (alive) setState({ status: "error", names: [] }); return; }
      const headers = { Authorization: `Bearer ${auth.accessToken}` };
      const dir = await fetch(`${auth.homeserver}/_matrix/client/v3/directory/room/${encodeURIComponent(alias)}`, { headers })
        .then((r) => r.json()).catch(() => null) as { room_id?: string } | null;
      const roomId = dir?.room_id;
      if (!roomId) { if (alive) setState({ status: "error", names: [] }); return; }
      const res = await fetch(`${auth.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/joined_members`, { headers });
      if (res.status === 403) { if (alive) setState({ status: "locked", names: [] }); return; }
      if (!res.ok) { if (alive) setState({ status: "error", names: [] }); return; }
      const data = (await res.json().catch(() => ({}))) as { joined?: Record<string, { display_name?: string }> };
      const joined = data.joined ?? {};
      const names = Object.entries(joined)
        .map(([mxid, m]) => m.display_name || mxid.slice(1, mxid.indexOf(":")))
        .sort((a, b) => a.localeCompare(b));
      if (alive) setState({ status: "open", names });
    })();
    return () => { alive = false; };
  }, [alias]);

  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: ".98rem", margin: "0 0 10px", color: "var(--ink-strong)" }}>
        Who&apos;s here
      </h3>
      {state.status === "loading" && <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>counting souls…</p>}
      {(state.status === "signedout" || state.status === "locked" || state.status === "error") && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>opens once this room does, for you</p>
      )}
      {state.status === "open" && (
        <>
          <p style={{ margin: "0 0 8px", fontSize: ".82rem", color: "var(--ink-body)" }}>
            {state.names.length} {state.names.length === 1 ? "soul has" : "souls have"} joined
          </p>
          {state.names.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {state.names.slice(0, 24).map((n) => (
                <li
                  key={n}
                  style={{ fontSize: ".76rem", color: "var(--muted)", background: "var(--glass)", border: "1px solid var(--glass-edge)", borderRadius: 999, padding: "2px 10px" }}
                >
                  {n}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
