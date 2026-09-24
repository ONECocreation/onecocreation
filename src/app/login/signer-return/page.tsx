"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { nip19 } from "nostr-tools";
import { applyMemberSession } from "@/hooks/useMemberSession";
import { CHALLENGE_ENDPOINT } from "@/lib/signer-doors";
import { safeNextPath } from "@/lib/next-path";
import DoorSheet from "@/components/door/DoorSheet";
import { isUnnamedKeyReason } from "@/components/door/door-machine";

/**
 * The NIP-55 landing strip — an Android signer app (Amber-class) signed our
 * challenge and bounced the browser back here with the event in the query.
 * We submit it to the SAME endpoint the other doors use and walk through.
 * The signed challenge is the auth; this page is just the courier.
 *
 * TASK-316 item 2: a good key that owns no tag yet is NOT an error — the
 * strip hands the visitor to the door's own new-name step with the signed
 * key (the event stays in MEMORY, never back into a URL — the claim route
 * expects exactly this event + npub, and no query-param stash exists
 * today). `next` survives: the door's own finish() reads it from this very
 * URL (landingFor walks a new soul to /welcome?next=…).
 */

function SignerReturn() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  /* a new key returning from the signer app: the door mounts in new-name
     with the signed key, in place of this strip */
  const [claimKey, setClaimKey] = useState<{ event: unknown; npub: string } | null>(null);
  const ran = useRef(false);

  const door = params.get("door") === "console" ? "console" : "login";
  const rawEvent = params.get("event");
  const rawNext = params.get("next");
  /* same-origin paths only — a callback param is not a teleporter */
  const next = safeNextPath(rawNext);

  useEffect(() => {
    if (ran.current) return; // one submission per landing, StrictMode included
    ran.current = true;
    async function deliver() {
      if (!rawEvent) {
        setError("no signed event arrived — the signer app sent nothing back");
        return;
      }
      let event: unknown;
      try {
        event = JSON.parse(rawEvent);
      } catch {
        setError("the signer's answer didn't parse — try the door again");
        return;
      }
      try {
        const res = await fetch(CHALLENGE_ENDPOINT[door], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event }),
        });
        let data: { ok?: boolean; reason?: string; handle?: string; space?: string; npub?: string | null } | null =
          null;
        try {
          data = await res.json();
        } catch {
          /* non-JSON = the server fell over, not the member */
        }
        if (!res.ok || !data?.ok) {
          /* TASK-316: the unnamed-key answer is the new-name walk, never an
             error — the door opens on its new-name step with the signed key */
          const pubkey = (event as { pubkey?: string }).pubkey;
          if (door === "login" && isUnnamedKeyReason(data?.reason) && pubkey) {
            setClaimKey({ event, npub: nip19.npubEncode(pubkey) });
            return;
          }
          setError(
            data?.reason ??
              `the server hiccuped (HTTP ${res.status}) — your signature was fine; tell the operator`
          );
          return;
        }
        if (door === "console") {
          /* operator cookie is set — a hard nav lets the /a layout re-read it */
          window.location.replace(next ?? "/a");
          return;
        }
        applyMemberSession({ handle: data.handle!, space: data.space!, npub: data.npub ?? null });
        router.replace(next ?? `/u/${data.handle}@${data.space}`);
      } catch {
        setError("couldn't reach the server — check your connection and try again");
      }
    }
    void deliver();
  }, [door, next, rawEvent, router]);

  /* the new-name walk: the door itself, full-page, with the signed key in
     memory — `next` rides this URL's own query, the door's finish() reads it */
  if (claimKey) {
    return <DoorSheet mount="page" initialKey={claimKey} />;
  }

  return (
    <div className="mx-auto w-full max-w-md text-center" style={{ background: "var(--glass)", backdropFilter: "blur(9px)", borderRadius: 24, border: "1px solid var(--glass-edge)", padding: "26px 24px", boxShadow: "0 26px 60px -30px rgba(5,3,16,.7)" }}>
      {error ? (
        <>
          <p className="mb-3" style={{ fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{error}</p>
          <Link
            href={door === "console" ? "/a" : "/login"}
            className="btn-quiet" style={{ padding: 0, color: "var(--teal-bright, #8FD0D8)" }}
          >
            ◀ BACK TO THE DOOR
          </Link>
        </>
      ) : (
        <p style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--teal-bright, #8FD0D8)" }}>
          READING YOUR SIGNATURE…
        </p>
      )}
    </div>
  );
}

export default function SignerReturnPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--ground, #141021)" }}>
      <Suspense fallback={null}>
        <SignerReturn />
      </Suspense>
    </main>
  );
}
