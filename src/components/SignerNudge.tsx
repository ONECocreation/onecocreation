/**
 * The gear-up nudge, shared by login and the profile editor: no signer
 * extension in this browser, here are the two doors. Never an nsec paste
 * box — the sign-in screen of a signer is the only place a key belongs.
 */
export default function SignerNudge() {
  return (
    <div style={{ borderRadius: 16, border: "1.5px solid rgba(217,178,78,.5)",
      background: "rgba(217,178,78,.08)", padding: "14px 16px" }}>
      <p style={{ margin: "0 0 6px", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em",
        textTransform: "uppercase", color: "var(--gold-2, #ebcb77)" }}>
        no key signer in this browser
      </p>
      <p style={{ margin: 0, fontSize: ".85rem", lineHeight: 1.7, color: "var(--ink-body)" }}>
        Install a signer extension, add your key, reload:{" "}
        <a
          href="https://github.com/fiatjaf/nos2x"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--teal-bright, #8FD0D8)", textDecoration: "underline" }}
        >
          nos2x
        </a>{" "}(just the signer, simplest) or{" "}
        <a
          href="https://getalby.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--teal-bright, #8FD0D8)", textDecoration: "underline" }}
        >
          Alby
        </a>{" "}(signer + wallet features later). A key is not a wallet — lesson one.
      </p>
    </div>
  );
}
