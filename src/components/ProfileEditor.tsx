"use client";

import { useState } from "react";
import { nip19 } from "nostr-tools";
import type { Event as NostrEvent } from "nostr-tools";
import type { EventTemplate, VerifiedEvent } from "nostr-tools/pure";
import { type RawKind0 } from "@/hooks/useNostrProfile";
import useFrenSession from "@/hooks/useFrenSession";
import SigningExplainer from "@/components/SigningExplainer";
import Kind0Doors from "@/components/Kind0Doors";
import ArtUpload from "@/components/ArtUpload";
import RelayResults from "@/components/RelayResults";
import { anyAccepted, publishKind0, type RelayResult } from "@/lib/kind0-publish";

/** The eight fields the form edits — Primal parity, arcade dress. These are
    all NOSTR profile-card fields: none of them touch the etched arcade tag. */
const FIELDS = [
  { key: "name", label: "NOSTR USERNAME", hint: "what nostr apps show — not your tag" },
  { key: "display_name", label: "DISPLAY NAME", hint: "the marquee version — change it any time; only your tag is etched" },
  { key: "about", label: "ABOUT ME", hint: "say something to the community", textarea: true },
  { key: "website", label: "WEBSITE", hint: "https://…" },
  { key: "lud16", label: "LIGHTNING ADDRESS (ZAPS)", hint: "name@wallet-provider — lightning, not an on-chain address" },
  { key: "nip05", label: "VERIFIED NOSTR ADDRESS (NIP-05)", hint: "" },
  { key: "picture", label: "AVATAR IMAGE URL", hint: "https:// image link" },
  { key: "banner", label: "BANNER IMAGE URL", hint: "https:// image link" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Draft = Record<FieldKey, string>;

const ADDRESS_RE = /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

/** https everywhere; plain-http only for localhost (the dev upload driver). */
export function isImageUrl(v: string): boolean {
  return /^https:\/\//i.test(v) || /^http:\/\/(localhost|127\.)/i.test(v);
}

function draftFrom(content: Record<string, unknown> | undefined, fallbackNip05: string): Draft {
  const read = (k: string) => {
    const v = content?.[k];
    return typeof v === "string" ? v : "";
  };
  return {
    name: read("name"),
    display_name: read("display_name"),
    about: read("about"),
    website: read("website"),
    lud16: read("lud16"),
    nip05: read("nip05") || fallbackNip05,
    picture: read("picture"),
    banner: read("banner"),
  };
}

function validate(draft: Draft): string | null {
  const web = draft.website.trim();
  if (web && !/^https?:\/\//i.test(web) && !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}/i.test(web)) {
    return "website doesn't look like a link";
  }
  for (const k of ["picture", "banner"] as const) {
    const v = draft[k].trim();
    if (v && !isImageUrl(v)) return `${k} must be an https:// image link`;
  }
  for (const k of ["lud16", "nip05"] as const) {
    const v = draft[k].trim();
    if (v && !ADDRESS_RE.test(v)) return `${k === "lud16" ? "lightning address" : "nostr address"} should look like name@domain`;
  }
  return null;
}

/**
 * EDIT PROFILE — Primal-parity kind-0 editor, own profile only. The flow is
 * read → merge → sign → publish, all in the browser: the key never touches
 * our server, there is no API route, and the merge spreads the RAW existing
 * content so fields other apps set (and fields we don't render) survive.
 * Publishing kind-0 replaces the whole card — the merge is the safety.
 *
 * Signing rides the signer doors (Kind0Doors): NIP-07 extension when
 * present, NIP-46 remote signer always. Publish results are shown per
 * relay, truthfully — one accepting relay is success (the network gossips),
 * but the fren sees exactly who took the card.
 */
export default function ProfileEditor({
  npub,
  handle,
  space,
  nip05Domain,
  raw,
  signal,
  onPublished,
}: {
  npub: string;
  handle: string;
  space: string;
  nip05Domain: string;
  /** The full current kind-0 (content object + created_at + tags) from
      useNostrProfile — null while tuning or when the fren is silent. */
  raw: RawKind0 | null;
  signal: "tuning" | "found" | "silent";
  /** FrenProfile's applyLocal — flips the page (and cache) optimistically. */
  onPublished: (content: Record<string, unknown>, created_at: number) => void;
}) {
  const { fren } = useFrenSession();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [relayResults, setRelayResults] = useState<RelayResult[] | null>(null);
  const [lnCheck, setLnCheck] = useState<"idle" | "checking" | "live" | "bad" | "unknown">("idle");

  /* the editor exists only on your own profile — UX gate; the real security
     is that publishing requires YOUR key in the signer anyway */
  if (!fren || fren.handle !== handle || fren.space !== space) return null;

  const defaultNip05 = `${handle}@${nip05Domain}`;

  function openEditor() {
    setDraft(draftFrom(raw?.content, defaultNip05));
    setError(null);
    setPublished(false);
    setRelayResults(null);
    setLnCheck("idle");
    setOpen(true);
  }

  /* Does the lightning address actually catch zaps? LNURL-pay lives at a
     well-known URL — ask it directly, best-effort (some providers block
     cross-site reads; that's an "unknown", not a failure). */
  async function testLightning() {
    const v = draft?.lud16.trim() ?? "";
    if (!ADDRESS_RE.test(v)) {
      setLnCheck("bad");
      return;
    }
    setLnCheck("checking");
    try {
      const [name, domain] = v.split("@");
      const res = await fetch(`https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`, {
        signal: AbortSignal.timeout(6000),
      });
      const data = (await res.json()) as { tag?: string };
      setLnCheck(data?.tag === "payRequest" ? "live" : "bad");
    } catch {
      setLnCheck("unknown");
    }
  }

  /* Build the card to sign — Kind0Doors calls this at sign time, so a slow
     bunker approval still gets a truthful created_at. */
  function prepare(): EventTemplate | { problem: string } {
    if (!draft) return { problem: "nothing to sign yet" };
    const problem = validate(draft);
    if (problem) return { problem };

    /* MERGE — the clobber guard: spread the whole existing card first, so
       every field other apps set survives; then apply the edits. An empty
       field removes its key (that's how you clear a value on nostr). */
    const content: Record<string, unknown> = { ...(raw?.content ?? {}) };
    for (const f of FIELDS) {
      let v = draft[f.key].trim();
      if (f.key === "website" && v && !/^https?:\/\//i.test(v)) v = `https://${v}`;
      if (v) content[f.key] = v;
      else delete content[f.key];
    }

    /* relays keep the newest created_at — never publish one that ties/loses */
    const created_at = Math.max(Math.floor(Date.now() / 1000), (raw?.created_at ?? 0) + 1);

    return { kind: 0, created_at, tags: raw?.tags ?? [], content: JSON.stringify(content) };
  }

  /* The signed card comes back from WHICHEVER door signed it — verify the
     key, then broadcast and show the per-relay truth. */
  async function submit(event: NostrEvent | VerifiedEvent): Promise<string | null> {
    /* wrong-key guard: the signer must hold THIS profile's key */
    const decoded = nip19.decode(npub);
    if (decoded.type !== "npub" || event.pubkey !== decoded.data) {
      return "this signer holds a different member's key — nothing sent";
    }
    setError(null);
    const results = await publishKind0(event as NostrEvent);
    setRelayResults(results);
    if (!anyAccepted(results)) {
      return "no relay accepted the card — nothing saved, try again";
    }
    let content: Record<string, unknown> = {};
    try {
      content = JSON.parse(event.content) as Record<string, unknown>;
    } catch {
      /* we built this content — unreachable, but never crash the flow */
    }
    onPublished(content, event.created_at);
    setPublished(true);
    setOpen(false);
    return null;
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={openEditor} className="btn btn-gold btn-sm">
          ✎ Edit profile
        </button>
        {published && relayResults && <RelayResults results={relayResults} />}
      </div>
    );
  }

  return (
    <section style={{ borderRadius: 20, border: "1px solid var(--glass-edge)", background: "var(--glass)", padding: "22px 20px", textAlign: "left" }}>
      <p style={{ margin: "0 0 4px", fontFamily: "var(--font-h3, sans-serif)", fontWeight: 400, fontSize: "1.2rem", color: "var(--ink-strong)" }}>Edit profile</p>
      <p className="mb-5" style={{ fontSize: ".8rem", lineHeight: 1.6, color: "var(--muted)" }}>
        {signal === "found"
          ? "Prefilled from your live signal. Saving signs a fresh card with your key and sends it to the relays — everything you set in other apps rides along untouched."
          : signal === "silent"
            ? "The relays haven't heard from you yet — this will be your first profile card."
            : "Still tuning the relays… fields may prefill in a moment."}
      </p>

      {/* the one thing this form can NEVER touch — answer the question
          before it's asked: the tag is registry + Bitcoin, not kind-0 */}
      <div className="mb-5" style={{ borderRadius: 14, border: "1.5px solid rgba(217,178,78,.45)", background: "rgba(217,178,78,.08)", padding: "10px 14px" }}>
        <p style={{ margin: "0 0 4px", fontSize: ".66rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-2, #ebcb77)" }}>
          your tag — etched, never changes
        </p>
        <p style={{ margin: 0, fontFamily: "monospace", fontSize: ".9rem", color: "var(--gold-2, #ebcb77)" }}>
          {handle}@{space}
        </p>
        <p className="mt-1" style={{ fontSize: ".76rem", color: "var(--muted)" }}>
          Everything below is your nostr profile card — the outfit, not the player. The tag
          stays yours no matter what you set here.
        </p>
      </div>

      <div className="space-y-4">
        {draft &&
          FIELDS.map((f) => (
            <div key={f.key}>
              <label
                htmlFor={`pe-${f.key}`}
                style={{ margin: "0 0 4px", display: "block", fontSize: ".66rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}
              >
                {f.label}
              </label>
              {"textarea" in f && f.textarea ? (
                <textarea
                  id={`pe-${f.key}`}
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  rows={3}
                  placeholder={f.hint}
                  style={{ width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1.5px solid rgba(180,134,43,.5)", background: "rgba(255,255,255,.94)", color: "#4a4458", padding: "10px 14px", fontSize: ".9rem", fontFamily: "inherit" }}
                />
              ) : (
                <input
                  id={`pe-${f.key}`}
                  type="text"
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  placeholder={f.hint}
                  style={{ width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1.5px solid rgba(180,134,43,.5)", background: "rgba(255,255,255,.94)", color: "#4a4458", padding: "10px 14px", fontSize: ".85rem", fontFamily: "monospace" }}
                />
              )}
              {f.key === "lud16" && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={testLightning}
                    disabled={lnCheck === "checking" || !draft.lud16.trim()}
                    className="btn-quiet" style={{ padding: "2px 0", color: "var(--teal-bright, #8FD0D8)" }}
                  >
                    {lnCheck === "checking" ? "testing…" : "test this address ⚡"}
                  </button>
                  {lnCheck === "live" && (
                    <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--ok, #7fb98f)" }}>
                      ✓ live — this address can catch zaps
                    </span>
                  )}
                  {lnCheck === "bad" && (
                    <span style={{ margin: 0, fontSize: ".8rem", color: "var(--err, #E7899E)" }}>
                      ✗ no zap service answered at that address
                    </span>
                  )}
                  {lnCheck === "unknown" && (
                    <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                      couldn&apos;t confirm from the browser (provider blocks cross-site checks) —
                      try a tiny zap from any wallet
                    </span>
                  )}
                </div>
              )}
              {f.key === "nip05" && draft.nip05.trim() !== defaultNip05 && (
                <div className="mt-1 space-y-1">
                  <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--warn, #EBCB77)" }}>
                    ⚠ {defaultNip05} is your verified address — change it and the checkmark
                    goes dark
                  </p>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, nip05: defaultNip05 })}
                    className="btn-quiet" style={{ padding: "2px 0", color: "var(--teal-bright, #8FD0D8)" }}
                  >
                    use {defaultNip05}</button>
                </div>
              )}
              {(f.key === "picture" || f.key === "banner") && (
                <div className="mt-1">
                  <ArtUpload
                    label={f.key === "picture" ? "upload avatar art" : "upload banner art"}
                    onUrl={(url) => setDraft({ ...draft, [f.key]: url })}
                  />
                </div>
              )}
              {(f.key === "picture" || f.key === "banner") &&
                isImageUrl(draft[f.key].trim()) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft[f.key].trim()}
                    alt=""
                    aria-hidden
                    className={
                      f.key === "picture"
                        ? "mt-2 h-14 w-14 object-cover"
                        : "mt-2 h-14 w-full object-cover"
                    }
                  />
                )}
            </div>
          ))}
      </div>

      {error && <p className="mt-4" style={{ fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{error}</p>}
      {relayResults && !published && (
        <div className="mt-4">
          <RelayResults results={relayResults} />
        </div>
      )}

      <div className="mt-5 space-y-3">
        <Kind0Doors prepare={prepare} submit={submit} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-ghost btn-sm"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4">
        <SigningExplainer kind="profile" />
      </div>
    </section>
  );
}
