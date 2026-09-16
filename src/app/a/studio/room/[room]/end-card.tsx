import Link from "next/link";

/**
 * THE DIRECTOR'S FAREWELL (TASK-306, 0018.06.25 a₿ · block ~967,218) —
 * the end card the desk shows when the frame hangs up. The 🕊️ line is
 * the house's own, verbatim (JitsiRoom/VdoRoomEndCard); the doors are
 * the CONSOLE's, not a guest's — the operator is not leaving a meeting,
 * she is closing a working desk: back to /a/studio (the desk's parent
 * room) or /a/live (the go-live door). A server-renderable leaf, passed
 * to VdoRoom's endCard prop by the desk page.
 */
export default function DirectorDeskEndCard() {
  return (
    <div className="card" style={{ padding: 32, textAlign: "center" }}>
      <p style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: "1.4rem", margin: "0 0 8px" }}>
        The field holds what you brought 🕊️
      </p>
      <p style={{ color: "var(--muted)", margin: "0 0 20px" }}>
        The desk is closed for now — everything waits where you left it.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn" href="/a/studio">Back to the studio desk</Link>
        <Link className="btn btn-ghost" href="/a/live">The go-live door</Link>
      </div>
    </div>
  );
}
