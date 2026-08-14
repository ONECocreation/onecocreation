import Link from "next/link";

/* The /u segment's fallback 404 — only unplayable input lands here (real
   missing tags get GameOverTag with the press-start invitation instead). */
export default function FrenNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-void px-6 text-center">
      <p className="font-arcade text-5xl text-ghost glow-ghost">Not Found</p>
      <p className="max-w-md font-body text-lg text-white/80">
        That&apos;s not a valid name — names are 3-20 characters, a-z, 0-9 and hyphens.
        Pick one that fits and claim it.
      </p>
      <Link href="/" className="btn btn-gold"> Claim a Name
      </Link>
      <p className="font-pixel text-xs text-white/40">
        <Link href="/" className="text-cyan hover:glow-cyan">
          Back to One Cocreation
        </Link>
      </p>
    </main>
  );
}
