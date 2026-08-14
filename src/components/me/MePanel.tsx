"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useFrenSession from "@/hooks/useFrenSession";
import useNostrProfile from "@/hooks/useNostrProfile";
import ProfileEditor from "@/components/ProfileEditor";
import { domainForSpace, SPACE_ROLES } from "@/lib/identity-config";

/* Mirrors MAX_SESSIONS in src/lib/fren-auth.ts — that module is server-only
   (node crypto), so the number is restated here rather than imported. */
const MAX_SESSIONS = 8;

/**
 * /me — the member's own control room. Three panels, all honest:
 *
 * 1. WHO YOU ARE — the ACTIVE name big (the name is what people see; the
 *    npub is plumbing, small and muted), plus every name the active key
 *    holds across this ship's known spaces (whois).
 * 2. YOUR DOORS — the 8-session switcher made visible: every signed-in
 *    door, switch, add another, close one, close all.
 * 3. YOUR PROFILE CARD — the kind-0 editor (ProfileEditor), loading the
 *    live signal from the big relays and signing through the signer doors.
 */

/* Space accent — a quiet tint difference between spaces (house ink). */
function accentColor(space: string): string {
  return space === "pacsarcade" ? "var(--gold-2, #ebcb77)" : "var(--teal-bright, #8FD0D8)";
}

/* the house glass shell (Admiral, 0018.05.15) — the cyan wireframe retired */
const glassCard: React.CSSProperties = {
  background: "var(--glass)", backdropFilter: "blur(9px)", borderRadius: 24,
  border: "1px solid var(--glass-edge)", padding: "24px 22px",
  boxShadow: "0 26px 60px -30px rgba(5,3,16,.7)",
};
const secLabel: React.CSSProperties = {
  margin: "0 0 6px", fontSize: ".7rem", fontWeight: 700, letterSpacing: ".14em",
  textTransform: "uppercase", color: "var(--gold-deep, #b4862b)",
};
const tealLink: React.CSSProperties = { color: "var(--teal-bright, #8FD0D8)", textDecoration: "underline" };

export default function MePanel() {
  const router = useRouter();
  const { fren, accounts, checked, signOut, signOutOne, switchTo } = useFrenSession();
  const { state: signal, raw, applyLocal } = useNostrProfile(fren?.npub);

  /* every name the ACTIVE key holds, across known spaces — public whois data */
  const [holds, setHolds] = useState<{ handle: string; space: string }[] | null>(null);
  useEffect(() => {
    if (!fren?.npub) return;
    let alive = true;
    fetch(`/api/frens/whois?npub=${fren.npub}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.ok) setHolds(d.holds);
      })
      .catch(() => {
        /* the listing is a nicety — the page stands without it */
      });
    return () => {
      alive = false;
    };
  }, [fren?.npub]);

  const [confirmAllOut, setConfirmAllOut] = useState(false);

  if (!checked) {
    return (
      <p className="mt-8 text-center" style={{ ...secLabel, color: "var(--muted)" }}>checking your session…</p>
    );
  }

  if (!fren) {
    return (
      <div className="mx-auto mt-8 w-full max-w-md text-center" style={glassCard}>
        <p style={{ fontFamily: "var(--serif, sans-serif)", fontWeight: 400, fontSize: "1.25rem", color: "var(--ink-strong)", margin: "0 0 8px" }}>
          🔑 This room needs your key
        </p>
        <p className="mb-5" style={{ fontSize: ".88rem", lineHeight: 1.7, color: "var(--ink-body)" }}>
          /me is your own control room — sessions, names, profile card. Sign in
          with your key to open it.
        </p>
        <Link href="/login" className="btn btn-gold" style={{ width: "100%", boxSizing: "border-box", textAlign: "center" }}>Sign in</Link>
        <p className="mt-4" style={{ fontSize: ".78rem", color: "var(--muted)" }}>
          New here?{" "}
          <Link href="/welcome" style={tealLink}>
            walk the welcome path
          </Link>{" "}
          — signer, name, face, all in order.
        </p>
      </div>
    );
  }

  const others = accounts.filter((a) => !(a.handle === fren.handle && a.space === fren.space));
  const heldElsewhere = (holds ?? []).filter(
    (h) => !(h.handle === fren.handle && h.space === fren.space)
  );

  return (
    <div className="mt-8 flex w-full flex-col gap-8">
      {/* ── WHO YOU ARE — the name is what people see ─────────────────── */}
      <section className="text-center" style={glassCard}>
        <p style={{ ...secLabel, marginBottom: 8 }}>Your active name</p>
        <p className="break-all" style={{ fontFamily: "var(--serif, sans-serif)", fontSize: "clamp(1.6rem,7vw,2.5rem)", lineHeight: 1.15, color: "var(--ink-strong)", margin: 0 }}>
          {fren.handle}
          <span style={{ color: accentColor(fren.space) }}>@{fren.space}</span>
        </p>
        <p className="mt-1" style={{ fontSize: ".7rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>
          {SPACE_ROLES[fren.space] ?? "verse"} space ·{" "}
          <Link href={`/u/${fren.handle}@${fren.space}`} style={tealLink}>
            public profile page
          </Link>
        </p>
        {fren.npub ? (
          <p className="mx-auto mt-4 max-w-md break-all" style={{ fontFamily: "monospace", fontSize: ".64rem", lineHeight: 1.6, color: "var(--muted)", opacity: .7 }}>
            {fren.npub}
          </p>
        ) : (
          <p className="mt-4" style={{ fontSize: ".74rem", textTransform: "uppercase", color: "var(--warn, #EBCB77)" }}>
            The registry doesn&apos;t know this name&apos;s key — tell the operator
          </p>
        )}
        <p className="mt-1" style={{ fontSize: ".74rem", color: "var(--muted)" }}>
          the long code is plumbing — the name is what people see
        </p>

        {/* every name this key holds on the ship's known spaces */}
        {holds !== null && (
          <div className="mt-5 pt-4 text-left" style={{ borderTop: "1px dashed var(--glass-edge)" }}>
            <p style={{ ...secLabel, color: "var(--muted)", marginBottom: 8 }}>Names this key holds</p>
            {holds.length === 0 ? (
              <p style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                the registry lists no names for this key — that shouldn&apos;t happen while
                you&apos;re signed in; tell the operator
              </p>
            ) : (
              <ul className="space-y-1">
                {holds.map((h) => {
                  const active = h.handle === fren.handle && h.space === fren.space;
                  return (
                    <li key={`${h.handle}@${h.space}`} className="flex items-center gap-2">
                      <span style={{ fontFamily: "monospace", fontSize: ".9rem", color: "var(--ink-strong)" }}>
                        {h.handle}
                        <span style={{ color: accentColor(h.space) }}>@{h.space}</span>
                      </span>
                      {active ? (
                        <span style={{ fontSize: ".68rem", textTransform: "uppercase", color: "var(--teal-bright, #8FD0D8)" }}>◆ active</span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            /* same key already proved itself — the PUT lets
                               a sibling name through without re-signing */
                            if (await switchTo(h.handle, h.space)) router.refresh();
                          }}
                          className="btn-quiet" style={{ padding: 0, color: "var(--teal-bright, #8FD0D8)" }}
                        >
                          ⇄ make active
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {heldElsewhere.length > 0 && (
              <p className="mt-2" style={{ fontSize: ".74rem", color: "var(--muted)" }}>
                same key, no re-signing — switching a sibling name is one press
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── YOUR DOORS — the 8-session switcher, visible and friendly ──── */}
      <section style={glassCard}>
        <p style={secLabel}>Your doors</p>
        <p className="mb-4" style={{ fontSize: ".78rem", color: "var(--muted)" }}>
          Every name signed in on this browser — up to {MAX_SESSIONS} at once. The
          top door is the active one; every page reads it.
        </p>
        <ul className="space-y-2">
          {accounts.map((a) => {
            const active = a.handle === fren.handle && a.space === fren.space;
            return (
              <li
                key={`${a.handle}@${a.space}`}
                className="flex flex-wrap items-center gap-3 px-3 py-2"
                style={{ borderRadius: 12, border: active ? "1.5px solid var(--gold-deep, #b4862b)" : "1px solid var(--glass-edge)",
                  background: active ? "rgba(217,178,78,.08)" : "transparent" }}
              >
                <span className="min-w-0 flex-1 truncate" style={{ fontFamily: "monospace", fontSize: ".9rem", color: "var(--ink-strong)" }}>
                  {a.handle}
                  <span style={{ color: accentColor(a.space) }}>@{a.space}</span>
                </span>
                {active ? (
                  <span style={{ fontSize: ".68rem", textTransform: "uppercase", color: "var(--teal-bright, #8FD0D8)" }}>◆ active</span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      if (await switchTo(a.handle, a.space)) router.refresh();
                    }}
                    className="btn-quiet" style={{ padding: 0, color: "var(--teal-bright, #8FD0D8)" }}
                  >
                    ⇄ switch
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await signOutOne(a.handle, a.space);
                    router.refresh();
                  }}
                  className="btn-quiet" style={{ padding: 0 }}
                >
                  close this door
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="btn btn-ghost btn-sm"
          >
            + Add another name
          </Link>
          {confirmAllOut ? (
            <span className="flex items-center gap-2">
              <span style={{ fontSize: ".72rem", textTransform: "uppercase", color: "var(--warn, #EBCB77)" }}>
                close all {accounts.length} door{accounts.length === 1 ? "" : "s"}?
              </span>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
                className="btn-quiet" style={{ padding: 0, color: "var(--warn, #EBCB77)" }}
              >
                yes — all out
              </button>
              <button
                type="button"
                onClick={() => setConfirmAllOut(false)}
                className="btn-quiet" style={{ padding: 0 }}
              >
                stay
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmAllOut(true)}
              className="btn-quiet" style={{ padding: 0 }}
            >
              sign out everywhere
            </button>
          )}
        </div>
        {others.length === 0 && (
          <p className="mt-3" style={{ fontSize: ".74rem", color: "var(--muted)" }}>
            one door open — add another name and switching becomes one press, no re-signing
          </p>
        )}
      </section>

      {/* ── YOUR PROFILE CARD — the kind-0 editor ─────────────────────── */}
      <section style={glassCard}>
        <p style={secLabel}>Your profile card</p>
        <p className="mb-4" style={{ fontSize: ".78rem", color: "var(--muted)" }}>
          {signal === "tuning" && "tuning the big relays for your current card…"}
          {signal === "found" && "your live signal, as the nostr network sees it right now."}
          {signal === "silent" &&
            "profile not found on the relays yet — publish your first card below and every nostr app learns your name."}
        </p>
        {fren.npub ? (
          <ProfileEditor
            npub={fren.npub}
            handle={fren.handle}
            space={fren.space}
            nip05Domain={domainForSpace(fren.space)}
            raw={raw}
            signal={signal}
            onPublished={applyLocal}
          />
        ) : (
          <p style={{ fontSize: ".74rem", textTransform: "uppercase", color: "var(--warn, #EBCB77)" }}>
            No key on record for this name — the editor can&apos;t verify a signature without it
          </p>
        )}
      </section>
    </div>
  );
}
