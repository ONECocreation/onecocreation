/**
 * THE PRE-JOIN CARD (TASK-297, 0018.06.25 a₿ · block ~967,218) — the one
 * beat before the room opens: your name (prefilled from the member
 * session when the site knows you, a field otherwise), camera and mic
 * BOTH OFF by default with a checkbox each (Love's call #4 item 6
 * ruling: guests arrive with both off and choose for themselves), and
 * the one honest line from item 9: allow camera and microphone when your
 * browser asks.
 *
 * A plain GET form, a SERVER component — no client JS on the door at
 * all. Submitting reloads this same page with `?join=1`, and the server
 * mounts the room with the toggles honoured in the minted frame URL
 * (mintStudioFrameTarget). Unchecked boxes simply ride absent — absent
 * reads as off, the honest default.
 */

const wrap: React.CSSProperties = {
  border: "1.5px solid rgba(139,118,196,.35)",
  borderRadius: 18,
  padding: "26px 22px",
  maxWidth: 520,
  margin: "0 auto",
  textAlign: "center",
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  gap: 18,
  justifyContent: "center",
  flexWrap: "wrap",
  margin: "14px 0 4px",
};

const checkLabel: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: ".88rem",
  color: "var(--ink-body)",
  cursor: "pointer",
};

export default function PreJoin({ room, initialName }: { room: string; initialName: string }) {
  return (
    <form method="GET" action={`/meet/studio/${encodeURIComponent(room)}`} style={wrap}>
      <input type="hidden" name="join" value="1" />
      <p style={{ margin: "0 0 14px", color: "var(--ink-body)", fontSize: ".92rem" }}>
        the room opens right here, inside the site — you never leave home for it.
      </p>
      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ display: "block", fontSize: ".68rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
          the name the room sees
        </span>
        <input
          name="label"
          defaultValue={initialName}
          placeholder="Guest"
          maxLength={48}
          style={{ width: "100%", textAlign: "center" }}
        />
      </label>
      <div style={toggleRow}>
        <label style={checkLabel}>
          <input type="checkbox" name="camera" value="1" />
          arrive on camera
        </label>
        <label style={checkLabel}>
          <input type="checkbox" name="mic" value="1" />
          arrive on mic
        </label>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: ".78rem", color: "var(--muted)" }}>
        you arrive with both off unless you tick one here — and you can change your mind inside the room, too.
      </p>
      <button type="submit" id="meet-studio-join" className="btn">
        Join the room
      </button>
      <p style={{ margin: "14px 0 0", fontSize: ".78rem", color: "var(--muted)" }}>
        allow camera and microphone when your browser asks.
      </p>
    </form>
  );
}
