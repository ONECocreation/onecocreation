import Link from "next/link";

/**
 * NOT OPEN YET (TASK-137, cut 0018.06.17 a₿) — the shared quiet panel for a
 * route whose switch is OFF. "If I turn the store off the guided
 * affirmations should be gone too… a quiet 'not open yet' panel on /store
 * rather than a dead page" (the Admiral). Built here for /store; any other
 * OFF route can adopt it the same way — one component, one voice, honest
 * about the state (words, not a blank 404) and never a color-only cue.
 */
export default function NotOpenYet({
  title = "Not open yet",
  body = "This part of the site isn't open yet — come back soon.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section style={{ padding: "120px 0 140px" }}>
      <div className="wrap center reveal" style={{ maxWidth: 560 }}>
        <p className="kicker center">One Cocreation</p>
        <h1 className="sec-h" style={{ marginBottom: 10 }}>{title}</h1>
        <p className="lead" style={{ margin: "0 auto 28px" }}>{body}</p>
        <Link className="btn" href="/">Back home</Link>
      </div>
    </section>
  );
}
