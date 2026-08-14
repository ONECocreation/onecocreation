/**
 * WHAT AM I SIGNING? — the education Pac asked for after his first nos2x
 * prompt. Lives beside every sign button so the extension popup is never
 * a mystery. Rule of the arcade: never sign what you can't read.
 */
export default function SigningExplainer({ kind }: { kind: "login" | "seat" | "profile" }) {
  return (
    <details style={{ borderRadius: 16, border: "1px solid var(--glass-edge)", background: "var(--glass)", padding: "12px 16px", textAlign: "left" }}>
      <summary className="btn-quiet" style={{ listStyle: "none", padding: 0 }}>what am I signing?</summary>
      <div className="mt-3 space-y-2" style={{ fontSize: ".8rem", lineHeight: 1.7, color: "var(--ink-body)" }}>
        {kind === "profile" ? (
          <>
            <p>
              Your extension will show a{" "}
              <span style={{ fontFamily: "monospace", color: "var(--teal-bright, #8FD0D8)" }}>kind: 0</span>{" "}event — your profile card.
              Unlike a login challenge, this one{" "}
              <span style={{ color: "var(--gold-2, #ebcb77)" }}>IS published</span>: it goes to the relays and becomes
              what every nostr app shows for you. Public by design — that&apos;s the point.
            </p>
            <p>
              Read it before approving: everything in it should be exactly what you typed here,
              nothing more. It replaces your previous card in one piece, and it still{" "}
              <span style={{ color: "var(--ok, #7fb98f)" }}>cannot move money</span> — signing is a signature, not
              a spend.
            </p>
            <p>
              And the standing rule: if an extension ever shows you something you can&apos;t
              read — don&apos;t sign it. Anywhere. Ever.
            </p>
          </>
        ) : (
          <>
            <p>
              Your extension will show a small event to approve. Read it — that habit is the
              whole security model:
            </p>
            <p>
              <span style={{ fontFamily: "monospace", color: "var(--teal-bright, #8FD0D8)" }}>
                {kind === "login" ? "PACS-LOGIN-<time>" : "PACS-SEAT-<class>-<run>-<tag>-<time>-NONCE-…"}
              </span>{" "}
              — the message. It proves your key answered{" "}
              <span style={{ color: "var(--gold-2, #ebcb77)" }}>right now</span>{" "}(the timestamp expires in minutes, so a
              copy is worthless later). No name, no tracking, nothing hidden.
            </p>
            <p>
              <span style={{ fontFamily: "monospace", color: "var(--teal-bright, #8FD0D8)" }}>kind: 22242</span> — an auth-only event type.
              It never gets published to relays, never appears on your feed, and{" "}
              <span style={{ color: "var(--ok, #7fb98f)" }}>cannot move money</span> — signing is a signature, not a
              spend.
            </p>
            <p>
              Press{" "}
              <span style={{ color: "var(--gold-2, #ebcb77)" }}>authorize / sign once</span> — not &quot;always
              allow&quot; until you trust a site. And if an extension ever shows you something you
              can&apos;t read: don&apos;t sign it. Anywhere. Ever.
            </p>
          </>
        )}
      </div>
    </details>
  );
}
