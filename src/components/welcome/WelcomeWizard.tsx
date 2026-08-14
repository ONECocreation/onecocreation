"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { nip19 } from "nostr-tools";
import type { Event as NostrEvent } from "nostr-tools";
import type { EventTemplate, VerifiedEvent } from "nostr-tools/pure";
import TagClaim from "@/components/TagClaim";
import Kind0Doors from "@/components/Kind0Doors";
import RelayResults from "@/components/RelayResults";
import ArtUpload from "@/components/ArtUpload";
import SigningExplainer from "@/components/SigningExplainer";
import useFrenSession from "@/hooks/useFrenSession";
import useNostrProfile from "@/hooks/useNostrProfile";
import { isAndroid } from "@/lib/signer-doors";
import { isImageUrl } from "@/components/ProfileEditor";
import { anyAccepted, publishKind0, type RelayResult } from "@/lib/kind0-publish";

/**
 * The welcome path — the nostr onboarding gauntlet, walked WITH the new
 * member. Doctrine: give them the choice, but give them an option —
 * sovereign path offered, working path default, honest states always.
 * Every step is skippable and the order is a suggestion, not a lock;
 * skipping is never punished.
 *
 * No keys are ever generated on this page — keys live in signers. The
 * guided mint for anyone who needs a key is nstart.me (new tab), or the
 * claim machine's own forge on the claim step.
 */

type StepKey = "signer" | "claim" | "face" | "email" | "wallet" | "school" | "done";

const STEP_TITLE: Record<StepKey, string> = {
  signer: "Signer",
  claim: "Name",
  face: "Profile",
  email: "Email",
  wallet: "Zaps",
  school: "School",
  done: "Go play",
};

/** The path bends to who's walking it (the Admiral's redirection,
 *  0018.05.17): a key member who claimed at the door is never taught what a
 *  key is or asked to claim again; an email member meets keys as an
 *  OPTIONAL side-quest; a visitor gets the full original walk. */
function pathFor(kind: "key" | "email" | "out"): StepKey[] {
  if (kind === "key") return ["face", "email", "wallet", "school", "done"];
  if (kind === "email") return ["signer", "school", "done"];
  return ["signer", "claim", "face", "wallet", "done"];
}

/* The site's quiet CTA, same as the booking flow. */
const CTA =
  "block w-full border border-cyan-600 px-3 py-2 text-center text-sm text-cyan-300 transition hover:bg-cyan-900/30";

/* hydration-safe one-shot platform read */
const noopSubscribe = () => () => {};
function usePlatform(): "android" | "ios" | "desktop" | null {
  return useSyncExternalStore(
    noopSubscribe,
    () =>
      isAndroid()
        ? "android"
        : /iphone|ipad|ipod/i.test(navigator.userAgent)
          ? "ios"
          : "desktop",
    () => null
  );
}
function useHasSignerInitial(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => !!window.nostr, () => null);
}

function StepChip({
  active,
  done,
  label,
  onClick,
}: {
  active: boolean;
  done: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer border px-2 py-1.5 text-xs uppercase tracking-wider ${
        active
          ? "border-cyan-600 text-cyan-300"
          : done
            ? "border-cyan-800 text-cyan-300"
            : "border-neutral-800 text-neutral-500 hover:text-cyan-300"
      }`}
    >
      {done && !active ? "✓ " : ""}
      {label}
    </button>
  );
}

export default function WelcomeWizard({
  space,
  nip05Domain,
}: {
  space: string;
  nip05Domain: string;
}) {
  const platform = usePlatform();
  const signerInitial = useHasSignerInitial();
  const { fren, checked } = useFrenSession();

  // arriving mid-path is honored: /welcome?step=face (the just-claimed fren
  // goes straight to dressing their profile, never back to "what is a key")
  const [stepWanted, setStep] = useState<StepKey | null>(() => {
    if (typeof window !== "undefined") {
      const want = new URLSearchParams(window.location.search).get("step");
      if (want && want in STEP_TITLE) return want as StepKey;
    }
    return null;
  });

  const sessionKind: "key" | "email" | "out" = fren ? (fren.space === "email" ? "email" : "key") : "out";
  const steps = pathFor(sessionKind);
  const step: StepKey = stepWanted && steps.includes(stepWanted) ? stepWanted : steps[0];

  /* the two new mile-markers */
  const [emailLinkStep, setEmailLinkStep] = useState<"email" | "code" | "done">("email");
  const [linkEmail, setLinkEmail] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkNote, setLinkNote] = useState("");
  const [school, setSchool] = useState<{ userId: string; joined: string[] } | null>(null);
  const [schoolBusy, setSchoolBusy] = useState(false);
  const [schoolNote, setSchoolNote] = useState("");
  const [schoolTried, setSchoolTried] = useState(false);
  const [portal, setPortal] = useState<{ slug: string; title: string; kind: string }[] | null>(null);

  async function linkStart(e: React.FormEvent) {
    e.preventDefault();
    if (linkBusy) return;
    setLinkBusy(true); setLinkNote("");
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: linkEmail }),
      });
      const d = (await res.json()) as { ok: boolean; reason?: string };
      if (d.ok) { setEmailLinkStep("code"); setLinkNote("a six-digit code is on its way to your inbox"); }
      else setLinkNote(d.reason ?? "that didn't send — try again");
    } catch { setLinkNote("couldn't reach the server — try again"); }
    finally { setLinkBusy(false); }
  }

  async function linkVerify(e: React.FormEvent) {
    e.preventDefault();
    if (linkBusy) return;
    setLinkBusy(true); setLinkNote("");
    try {
      const res = await fetch("/api/member/link-email", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: linkEmail, code: linkCode }),
      });
      const d = (await res.json()) as { ok: boolean; reason?: string };
      if (d.ok) { setEmailLinkStep("done"); setLinkNote(""); }
      else setLinkNote(d.reason ?? "that code didn't match — try again");
    } catch { setLinkNote("couldn't reach the server — try again"); }
    finally { setLinkBusy(false); }
  }

  async function connectSchool() {
    if (schoolBusy) return;
    setSchoolBusy(true); setSchoolNote("");
    try {
      const res = await fetch("/api/matrix/login", { method: "POST" });
      const d = (await res.json()) as { ok?: boolean; userId?: string; joined?: string[]; reason?: string };
      if (d.ok && d.userId) {
        setSchool({ userId: d.userId, joined: d.joined ?? [] });
        // the portal: which doors stand open for this soul, by name
        try {
          const rf = await fetch("/api/matrix/rooms");
          const rd = (await rf.json()) as { ok?: boolean; rooms?: { slug: string; title: string; kind: string; open: boolean }[] };
          if (rd.ok) setPortal((rd.rooms ?? []).filter((r) => r.open));
        } catch { /* the connect stands even if the shelf read hiccups */ }
      } else setSchoolNote(d.reason ?? "the school door didn't answer — try again");
    } catch { setSchoolNote("couldn't reach the server — try again"); }
    finally { setSchoolBusy(false); setSchoolTried(true); }
  }

  /* already-connected members never see a "connect" ask (Admiral,
     0018.05.17) — arriving on the step opens the portal by itself;
     the button only appears if the quiet attempt failed */
  useEffect(() => {
    if (step === "school" && fren && !school && !schoolBusy && !schoolTried) void connectSchool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, fren, school, schoolBusy, schoolTried]);

  /* signer re-detect — "I have my signer now" presses this */
  const [signerRecheck, setSignerRecheck] = useState<boolean | null>(null);
  const [recheckedOnce, setRecheckedOnce] = useState(false);
  const signerPresent = signerRecheck ?? signerInitial;

  /* the key whose card the face/wallet steps edit: the session's npub, or
     one read from the NIP-07 signer on demand */
  const [connectedNpub, setConnectedNpub] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const npub = fren?.npub ?? connectedNpub;
  const { state: signal, profile, raw, applyLocal } = useNostrProfile(npub);

  /* face + wallet drafts — null = "not touched yet, show the live value" */
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [pictureDraft, setPictureDraft] = useState<string | null>(null);
  const [lud16Draft, setLud16Draft] = useState<string | null>(null);
  const [faceResults, setFaceResults] = useState<RelayResult[] | null>(null);
  const [walletResults, setWalletResults] = useState<RelayResult[] | null>(null);

  const liveName = typeof profile?.name === "string" ? profile.name : "";
  const livePicture = typeof profile?.picture === "string" ? profile.picture : "";
  const liveLud16 = typeof profile?.lud16 === "string" ? profile.lud16 : "";
  // the name they chose at the door IS their community name — a card with
  // no name yet defaults to the claimed handle (Admiral, 0018.05.17)
  const nameValue = nameDraft ?? (liveName || fren?.handle || "");
  const pictureValue = pictureDraft ?? livePicture;
  const lud16Value = lud16Draft ?? liveLud16;

  async function connectNip07() {
    setConnectError(null);
    if (!window.nostr) {
      setConnectError("no signer extension answered — step 1 has the gear-up doors");
      return;
    }
    try {
      setConnectedNpub(nip19.npubEncode(await window.nostr.getPublicKey()));
    } catch {
      setConnectError("the signer declined — nothing read");
    }
  }

  /* one merge-and-sign builder for both mini steps */
  function prepareCard(edits: Record<string, string>): EventTemplate | { problem: string } {
    if (!npub) return { problem: "connect your signer or sign in first" };
    if (signal === "tuning") {
      return { problem: "still reading your current card from the relays — a moment" };
    }
    const content: Record<string, unknown> = { ...(raw?.content ?? {}) };
    for (const [k, v] of Object.entries(edits)) {
      const t = v.trim();
      if (t) content[k] = t;
      else delete content[k];
    }
    const created_at = Math.max(Math.floor(Date.now() / 1000), (raw?.created_at ?? 0) + 1);
    return { kind: 0, created_at, tags: raw?.tags ?? [], content: JSON.stringify(content) };
  }

  function makeSubmit(setResults: (r: RelayResult[]) => void) {
    return async (event: NostrEvent | VerifiedEvent): Promise<string | null> => {
      if (npub) {
        const decoded = nip19.decode(npub);
        if (decoded.type !== "npub" || event.pubkey !== decoded.data) {
          return "that signer holds a different key than the one this card belongs to — nothing sent";
        }
      }
      const results = await publishKind0(event as NostrEvent);
      setResults(results);
      if (!anyAccepted(results)) return "no relay accepted the card — nothing saved, try again";
      try {
        applyLocal(JSON.parse(event.content) as Record<string, unknown>, event.created_at);
      } catch {
        /* we built this content — unreachable, but never crash the flow */
      }
      return null;
    };
  }

  const stepDone: Record<StepKey, boolean> = {
    signer: signerPresent === true,
    claim: !!fren,
    face: signal === "found" && !!liveName,
    email: emailLinkStep === "done",
    wallet: !!liveLud16,
    school: !!school,
    done: false,
  };

  const idx = steps.indexOf(step);
  const next = () => setStep(steps[Math.min(idx + 1, steps.length - 1)]);
  const back = () => setStep(steps[Math.max(idx - 1, 0)]);

  /* the wayfinding row (Admiral, 0018.05.17): honest arrows both ways, and
     "skip for now" that says what it means — nothing here punishes you */
  const skipRow = (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-neutral-800 pt-3">
      {idx > 0 ? (
        <button
          type="button"
          onClick={back}
          className="cursor-pointer text-xs uppercase text-neutral-500 hover:text-cyan-300"
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      <span className="flex items-center gap-4">
        <button
          type="button"
          onClick={next}
          className="cursor-pointer text-xs uppercase text-neutral-500 underline hover:text-cyan-300"
          title="everything here can be done later from /me"
        >
          Skip for now — come back any time
        </button>
        <button
          type="button"
          onClick={next}
          className="cursor-pointer border border-cyan-700 px-3 py-1.5 text-xs uppercase text-cyan-300 hover:bg-cyan-900/30"
        >
          Next →
        </button>
      </span>
    </div>
  );

  return (
    <div className="mt-8 flex w-full flex-col gap-6">
      {/* the path — every chip is a door, not a lock */}
      <nav className="flex flex-wrap justify-center gap-2" aria-label="welcome steps">
        {steps.map((k, i) => (
          <StepChip
            key={k}
            active={step === k}
            done={stepDone[k]}
            label={k === "done" ? "★ Go play" : `${i + 1} · ${STEP_TITLE[k]}`}
            onClick={() => setStep(k)}
          />
        ))}
      </nav>

      {/* ── STEP 1: SIGNER ─────────────────────────────────────────────── */}
      {step === "signer" && (
        <section className="border border-neutral-800 p-6">
          <p className="mb-1 text-xs uppercase tracking-widest text-cyan-300">
            Your signer — the key to everything
          </p>
          <div className="mb-4 border border-neutral-800 px-3 py-2">
            <p className="mb-1 text-xs uppercase tracking-wider text-neutral-500">
              What is a key?
            </p>
            <p className="text-xs leading-relaxed text-neutral-300">
              On nostr there are no accounts — there is one cryptographic key
              pair, and it IS you. The public half is your address; the secret
              half signs everything you do, and whoever holds it is you,
              forever, with no reset button. That&apos;s why the key never
              lives in a website (including this one): it lives in a{" "}
              <span className="text-cyan-300">signer</span> — a small app that
              holds the key and stamps signatures when you approve — and every
              site just asks the signer. A key is not a wallet, and signing
              can never move money.
            </p>
          </div>

          {signerPresent ? (
            <div className="border border-cyan-600 p-4">
              <p className="text-xs uppercase tracking-wider text-cyan-300">
                ✓ Signer detected — you&apos;re ready
              </p>
              <p className="mt-2 text-xs text-neutral-300">
                A signer extension answered in this browser. Every sign-and-approve
                on this site goes through it — your key never leaves it.
              </p>
              <button type="button" onClick={next} className={`mt-4 ${CTA}`}> Next — claim your name
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* per-platform guidance — the platform's own door first */}
              {(platform === "desktop" || platform === null) && (
                <div className="border border-cyan-800 p-4">
                  <p className="mb-1 text-xs uppercase tracking-wider text-cyan-300">
                    On a desktop · browser extension
                  </p>
                  <p className="text-xs text-neutral-300">
                    Install a signer extension, add your key, reload:{" "}
                    <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
                      nos2x
                    </a>{" "}
                    (just the signer, simplest) or{" "}
                    <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
                      Alby
                    </a>{" "}
                    (signer + wallet features later).
                  </p>
                </div>
              )}
              {(platform === "android" || platform === null) && (
                <div className="border border-cyan-800 p-4">
                  <p className="mb-1 text-xs uppercase tracking-wider text-cyan-300">
                    On Android · signer app
                  </p>
                  <p className="text-xs text-neutral-300">
                    Install{" "}
                    <a href="https://github.com/greenart7c3/Amber" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
                      Amber
                    </a>{" "}
                    — a signer app that holds your key on the phone; the browser
                    bounces to it for each approval and bounces back signed.
                  </p>
                </div>
              )}
              {(platform === "ios" || platform === null) && (
                <div className="border border-cyan-800 p-4">
                  <p className="mb-1 text-xs uppercase tracking-wider text-cyan-300">
                    On iPhone / anything else · remote signer
                  </p>
                  <p className="text-xs text-neutral-300">
                    Set up a remote signer like{" "}
                    <a href="https://nsec.app" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
                      nsec.app
                    </a>{" "}
                    — your key lives there and answers over nostr itself; every
                    signing door on this site takes a bunker address.
                  </p>
                </div>
              )}
              <div className="border border-neutral-700 p-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-amber-300">
                  No key yet at all?
                </p>
                <p className="text-xs text-neutral-300">
                  Two honest options: the claim step (next) can forge one right
                  in your browser with the full ceremony — or{" "}
                  <a href="https://nstart.me" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
                    nstart.me
                  </a>{" "}
                  is a guided key mint run by the nostr community (opens in a
                  new tab). Either way the key ends up in a signer, never in a
                  website.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecheckedOnce(true);
                  setSignerRecheck(!!window.nostr);
                }}
                className={CTA}
              > I have my signer now — check again
              </button>
              {recheckedOnce && signerRecheck === false && (
                <p className="text-xs text-amber-300">
                  ◌ still no extension answering here — signer apps and remote signers
                  don&apos;t show up in this check; if yours is one of those, just walk on
                </p>
              )}
            </div>
          )}
          {skipRow}
        </section>
      )}

      {/* ── STEP 2: CLAIM — the real claim machine, embedded ───────────── */}
      {step === "claim" && (
        <section>
          <div className="mb-4 border border-neutral-800 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-cyan-300">
              Claim your name
            </p>
            <p className="mt-2 text-xs text-neutral-400">
              name@{space} — verified on nostr the moment you claim, queued for
              the Bitcoin anchor batch. The same machine as the front page,
              nothing watered down.
            </p>
            {fren && (
              <p className="mt-2 text-xs uppercase text-cyan-300">
                ✓ already signed in as {fren.handle}@{fren.space} —
                claiming another is allowed, skipping is free
              </p>
            )}
          </div>
          <TagClaim space={space} nip05Domain={nip05Domain} />
          <div className="mx-auto mt-4 max-w-2xl">{skipRow}</div>
        </section>
      )}

      {/* ── STEP 3: FACE — name + picture, sign & publish ──────────────── */}
      {step === "face" && (
        <section className="border border-neutral-800 p-6">
          <p className="mb-1 text-xs uppercase tracking-widest text-cyan-300">
            Your profile — name and face
          </p>
          <p className="mb-4 text-xs text-neutral-400">
            Your name and picture live in a small signed card (kind 0) that
            every nostr app reads. We read your current card first, change only
            these fields, and you sign the result — nothing else gets touched.
          </p>
          {/* a found card is a FEATURE, said out loud — it read as a ghost
              to the Admiral on the eat6 walk (0018.05.17) */}
          {signal === "found" && (liveName || livePicture) && (
            <p className="mb-4 border border-cyan-900 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-200">
              ✓ Your key already wears a card across nostr{liveName ? <> — <b>{liveName}</b></> : null}.
              That&apos;s not a leftover from this site; it&apos;s your real profile, and it came with
              you. Keep it as is, or tune it here.
            </p>
          )}

          {!npub ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-300">
                This step needs to know WHICH key&apos;s card to edit — so it can
                read your current one before rewriting anything.
              </p>
              <button type="button" onClick={connectNip07} className={CTA}> Read my public key from my signer
              </button>
              {connectError && (
                <p className="text-xs text-amber-300">◌ {connectError}</p>
              )}
              <p className="text-xs text-neutral-400">
                Using a remote signer or signer app instead?{" "}
                <Link href="/login" className="text-cyan-300 underline">
                  sign in once
                </Link>{" "}
                (all three doors live there) and come back — or skip and dress
                up later at /me.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {signal === "tuning" && (
                <p className="text-xs uppercase text-amber-300">
                  reading your current card from the relays…
                </p>
              )}
              {signal === "silent" && (
                <p className="text-xs uppercase text-neutral-400">
                  profile not found on the relays yet — this will be your first card
                </p>
              )}
              <div>
                <label htmlFor="ww-name" className="mb-1 block text-xs uppercase tracking-wider text-neutral-500">
                  Name — what nostr apps show
                </label>
                <input
                  id="ww-name"
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder={fren ? fren.handle : "your name"}
                  className="w-full border border-neutral-700 bg-transparent p-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="ww-picture" className="mb-1 block text-xs uppercase tracking-wider text-neutral-500">
                  Picture — upload or paste a URL
                </label>
                <input
                  id="ww-picture"
                  type="text"
                  value={pictureValue}
                  onChange={(e) => setPictureDraft(e.target.value)}
                  placeholder="https:// image link"
                  className="w-full border border-neutral-700 bg-transparent p-2 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-cyan-600 focus:outline-none"
                />
                <div className="mt-1">
                  <ArtUpload label="UPLOAD AVATAR ART" onUrl={(url) => setPictureDraft(url)} />
                </div>
                {isImageUrl(pictureValue.trim()) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pictureValue.trim()}
                    alt=""
                    aria-hidden
                    className="mt-2 h-14 w-14 border border-neutral-800 object-cover"
                  />
                )}
              </div>
              {faceResults && <RelayResults results={faceResults} />}
              <Kind0Doors
                prepare={() => {
                  if (!nameValue.trim() && !pictureValue.trim()) {
                    return { problem: "give yourself a name or a picture first — or skip" };
                  }
                  if (pictureValue.trim() && !isImageUrl(pictureValue.trim())) {
                    return { problem: "picture must be an https:// image link" };
                  }
                  return prepareCard({ name: nameValue, picture: pictureValue });
                }}
                submit={makeSubmit(setFaceResults)}
              />
              <SigningExplainer kind="profile" />
              {faceResults && anyAccepted(faceResults) && (
                <button type="button" onClick={next} className={CTA}> Next — catch zaps
                </button>
              )}
            </div>
          )}
          {skipRow}
        </section>
      )}

      {/* ── STEP 4: WALLET (optional, never punished) ──────────────────── */}
      {step === "wallet" && (
        <section className="border border-neutral-800 p-6">
          <p className="mb-1 text-xs uppercase tracking-widest text-cyan-300">
            Catch zaps <span className="text-neutral-500">(optional)</span>
          </p>
          <p className="mb-4 text-xs leading-relaxed text-neutral-400">
            A lightning address is how people zap you — tiny bitcoin tips,
            straight to you. It looks like an email; it isn&apos;t one. Easy
            paths: <b>Primal</b> or <b>Coinos</b> give you one in minutes and
            speak <b>Nostr Wallet Connect</b>, so apps can zap on your behalf
            with your say-so; <b>Zeus</b> or <b>Phoenix</b> when you want the
            keys in your own hands (and <b>Nunchuk</b> holds your on-chain
            savings either way). Swap any time; add it later at /me —
            nothing here expires.
          </p>

          {!npub ? (
            <p className="text-sm text-neutral-300">
              Same as the face step — this edits your signed card, so it needs
              your key connected. Use step 3 to connect, or{" "}
              <Link href="/login" className="text-cyan-300 underline">
                sign in
              </Link>{" "}
              and come back. Skipping is completely fine.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="ww-lud16" className="mb-1 block text-xs uppercase tracking-wider text-neutral-500">
                  Lightning address (LUD16)
                </label>
                <input
                  id="ww-lud16"
                  type="text"
                  value={lud16Value}
                  onChange={(e) => setLud16Draft(e.target.value)}
                  placeholder="name@wallet-provider"
                  className="w-full border border-neutral-700 bg-transparent p-2 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              {walletResults && <RelayResults results={walletResults} />}
              <Kind0Doors
                prepare={() => {
                  const v = lud16Value.trim();
                  if (!v) return { problem: "paste a lightning address first — or skip, honestly" };
                  if (!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) {
                    return { problem: "that doesn't look like name@domain" };
                  }
                  return prepareCard({ lud16: v });
                }}
                submit={makeSubmit(setWalletResults)}
              />
              {walletResults && anyAccepted(walletResults) && (
                <button type="button" onClick={next} className={CTA}> Next — go play
                </button>
              )}
            </div>
          )}
          {skipRow}
        </section>
      )}

      {/* ── DONE — the doors of the site ───────────────────────────────── */}
      {/* ── EMAIL — letters & receipts find you (key members) ──────────── */}
      {step === "email" && (
        <section className="border border-neutral-800 p-6">
          <p className="mb-1 text-xs uppercase tracking-widest text-cyan-300">Email — so letters find you</p>
          <p className="mb-4 text-xs text-neutral-400">
            Optional, and kind to future-you: receipts, session reminders and Love&apos;s letters
            need somewhere to land. Your key stays your login — this only links an inbox.
          </p>
          {emailLinkStep === "done" ? (
            <p className="text-sm text-cyan-300">✓ {linkEmail} is linked — letters and receipts will find you.</p>
          ) : emailLinkStep === "email" ? (
            <form onSubmit={linkStart} className="flex flex-wrap gap-2">
              <input
                type="email" required autoFocus value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="your@email.com"
                className="min-w-52 flex-1 border border-neutral-700 bg-transparent px-3 py-2 text-sm"
              />
              <button className={CTA} style={{ width: "auto", paddingInline: 18 }} disabled={linkBusy}>
                {linkBusy ? "Sending…" : "Email me a code"}
              </button>
            </form>
          ) : (
            <form onSubmit={linkVerify} className="flex flex-wrap gap-2">
              <input
                inputMode="numeric" required autoFocus value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="w-36 border border-neutral-700 bg-transparent px-3 py-2 text-sm tracking-[.3em]"
              />
              <button className={CTA} style={{ width: "auto", paddingInline: 18 }} disabled={linkBusy || linkCode.length !== 6}>
                {linkBusy ? "Checking…" : "Link it"}
              </button>
            </form>
          )}
          {linkNote && <p className="mt-3 text-xs text-neutral-400">{linkNote}</p>}
          {skipRow}
        </section>
      )}

      {/* ── SCHOOL — the portal reveals itself; no ask, no ceremony ────── */}
      {step === "school" && (
        <section className="border border-neutral-800 p-6">
          <p className="mb-1 text-xs uppercase tracking-widest text-cyan-300">Your class portal</p>
          {school ? (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-neutral-400">
                Your school account — <b className="text-neutral-200">{school.userId}</b> — is live on
                One Cocreation&apos;s own server. These doors are open for you:
              </p>
              {portal && portal.length > 0 ? (
                <div className="grid gap-2">
                  {portal.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/rooms/${r.slug}`}
                      className="flex items-center justify-between border border-neutral-800 px-3 py-2 text-neutral-200 hover:border-cyan-700"
                    >
                      <span>{r.kind === "class" ? "🎓" : "🏠"} {r.title}</span>
                      <span className="text-xs uppercase text-cyan-300">enter →</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400">
                  The Commons opens for every member; classes open with a package —{" "}
                  <Link href="/memberships" className="text-cyan-300 underline">see the memberships</Link>.
                </p>
              )}
              <p className="text-xs text-neutral-500">
                Same rooms, anywhere: sign into{" "}
                <a href="https://app.element.io" target="_blank" rel="noreferrer" className="text-cyan-300 underline">Element</a>{" "}
                on your phone with this account and they&apos;re simply there.
              </p>
            </div>
          ) : schoolBusy || !schoolTried ? (
            <p className="text-sm text-neutral-400">opening your portal…</p>
          ) : (
            <button type="button" onClick={connectSchool} className={CTA}>
              Open my portal
            </button>
          )}
          {schoolNote && <p className="mt-3 text-xs text-neutral-400">{schoolNote}</p>}
          {skipRow}
        </section>
      )}

      {step === "done" && (
        <section className="border border-cyan-600 p-6 text-center">
          <p className="mb-3 text-xs uppercase tracking-widest text-cyan-300">You made it</p>
          {checked && fren ? (
            <p className="mb-2 break-all text-[clamp(1.4rem,6vw,2rem)] leading-tight text-neutral-100">
              {fren.handle}@{fren.space}
            </p>
          ) : (
            <p className="mb-2 text-sm text-neutral-400">
              No session on this browser yet — claim a name and{" "}
              <Link href="/login" className="text-cyan-300 underline">
                sign in
              </Link>{" "}
              whenever you&apos;re ready; the steps behind you stay done.
            </p>
          )}
          <p className="mb-5 text-xs text-neutral-400">
            everything you set here is yours — key, name, card. no account to lose.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/me" className={CTA}>
              My profile · /me
            </Link>
            <Link href="/store" className={CTA}>
              The store
            </Link>
            {/* Bitcoin Buddy is frens.earth furniture (Admiral, 0018.05.17)
                — off here until Love blesses the concept (question sheet) */}
            <Link href="/classes" className={CTA}>
              Your rooms
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
