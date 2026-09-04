import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import OperatorGate from "@/components/OperatorGate";
import Markdown from "@/components/Markdown";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { RECON_ROOT, reconPage } from "@/lib/shinepages-recon";

/**
 * /studio/reference/[slug] (TASK-105, cut 0018.06.12 a₿) — the ShinePages
 * recon viewer. Love wanted to verify the old site's fonts, sizes and colors
 * against ours before switching anything, so each captured page renders its
 * verbatim copy beside its scroll-series shots, under a sticky STYLE STRIP
 * that puts ShinePages' global styling (docs/shinepages-recon/styling/INDEX.md)
 * next to OUR live cartridge tokens — "ShinePages → ours".
 *
 * Gated EXACTLY like /studio ([[...slug]]/page.tsx): no operator cookie, no
 * viewer. The static `reference` segment beats the optional catch-all, so
 * this route never collides with editing a page.
 *
 * READ-ONLY LAW: the markdown comes from the committed vault with node fs at
 * request time; the shots come through /api/recon-img's allowlisted fence.
 * Nothing here writes — not to KV, not to the vault, not to the seeds.
 */

export const metadata: Metadata = {
  title: "Reference — ShinePages capture — One Cocreation admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const MONO = "var(--font-mono)";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/* ── our side of the strip: read the cartridge's OWN tokens at request time
   (never re-typed here — a cartridge edit is meant to flow into the
   comparison on next paint). First occurrence wins = the night :root set. ── */
async function ourTokens(): Promise<Record<string, string | null>> {
  const css = await readFile(join(process.cwd(), "src/app/cartridge.css"), "utf8");
  const grab = (name: string): string | null =>
    css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? null;
  return {
    "font-body": grab("font-body"),
    "font-h1": grab("font-h1"),
    "font-h2": grab("font-h2"),
    "font-h3": grab("font-h3"),
    serif: grab("serif"),
    lavender: grab("lavender"),
    cream: grab("cream"),
    "btn-ink": grab("btn-ink"),
  };
}

interface PairRow {
  label: string;
  theirs: string;
  ours: string | null;
}

const rowLabel: React.CSSProperties = { flex: "none", width: 118, fontSize: 11, fontWeight: 700, color: "var(--puck-color-text)" };
const cell: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: 11, fontFamily: MONO, lineHeight: 1.5, color: "var(--puck-color-text-secondary)" };

function Pair({ row }: { row: PairRow }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "3px 0", borderTop: "1px solid rgba(139,118,196,.12)" }}>
      <span style={rowLabel}>{row.label}</span>
      <span style={cell}>{row.theirs}</span>
      <span style={{ ...cell, color: "var(--puck-color-text)" }}>{row.ours ?? "no token"}</span>
    </div>
  );
}

/* legibility doctrine: every swatch's hex is written next to it in plain
   text — meaning never rides on color alone */
function Swatch({ hex }: { hex: string }) {
  return (
    <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: hex,
      border: "1px solid rgba(139,118,196,.5)", verticalAlign: "-2px", marginRight: 6 }} />
  );
}

export default async function ReferencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  const { slug } = await params;
  const entry = reconPage(slug);
  if (!entry) notFound();

  const md = await readFile(join(process.cwd(), RECON_ROOT, entry.md), "utf8").catch(() => null);
  const t = await ourTokens();

  const typeRows: PairRow[] = [
    { label: "Paragraph", theirs: "Lucida Grande", ours: t["font-body"] ? `--font-body: ${t["font-body"]}` : null },
    { label: "H1", theirs: "Helvetica", ours: t["font-h1"] ? `--font-h1: ${t["font-h1"]}` : null },
    { label: "H2", theirs: "Helvetica", ours: t["font-h2"] ? `--font-h2: ${t["font-h2"]}` : null },
    { label: "H3", theirs: "Helvetica", ours: t["font-h3"] ? `--font-h3: ${t["font-h3"]}` : null },
    { label: "Heading sizes", theirs: "46px / normal / 1.2 · another level 38px / normal / 1.3", ours: "no fixed px tokens — house.css clamps (e.g. .sec-h clamp(1.9rem, 5vw, 2.6rem))" },
    { label: "Quote", theirs: "Barlow", ours: t.serif ? `--serif: ${t.serif} (points at Barlow — a match)` : null },
    { label: "Text links", theirs: "#3e3e3e underline · hover #6a6a6a underline", ours: t.lavender ? `house.css a { color: var(--lavender) = ${t.lavender}; no underline }` : null },
  ];
  const paletteRows: PairRow[] = [
    { label: "Primary", theirs: "#000000", ours: null },
    { label: "Secondary", theirs: "#dbd4e4 (the lavender)", ours: t.lavender ? `--lavender: ${t.lavender}` : null },
    { label: "Palette 3", theirs: "#e1e1e1", ours: null },
    { label: "Palette 4", theirs: "#ead9cb", ours: null },
    { label: "Palette 5", theirs: "#f3f0ec", ours: t.cream ? `--cream: ${t.cream} (nearest)` : null },
    { label: "Background", theirs: "#cccccc", ours: null },
    { label: "Main text", theirs: "#a1adba", ours: null },
  ];
  const buttonRow: PairRow = {
    label: "Button preset",
    theirs: "color/border black · padding 20px · radius 4px · border 0 · hover “slide color to the right”",
    ours: t["btn-ink"]
      ? `.btn (house.css): white fill · ink --btn-ink ${t["btn-ink"]} · padding 20px 40px · radius 0 (square law) · Open Sans 700 · hover translateY(-3px)`
      : null,
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--puck-color-surface)", fontFamily: SANS }}>
      {/* ── STYLE STRIP — sticky; the whole reason the Admiral ordered this
          room: verify fonts/sizes/colors against the live cartridge ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--puck-color-surface)",
        borderBottom: "1px solid var(--oc-structural-edge, rgba(139,118,196,.35))", padding: "12px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--puck-color-text)" }}>STYLE STRIP</span>
          <span style={{ fontSize: 11, color: "var(--puck-color-text-muted)" }}>
            ShinePages global styling (capture 0018.06.12) → ours (cartridge.css night tokens, read live)
          </span>
          <span style={{ flex: 1 }} />
          <a href="/studio" style={{ fontSize: 11, color: "var(--puck-color-text-secondary)" }}>← back to the studio</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "0 28px", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "var(--puck-color-text-muted)", padding: "4px 0" }}>TYPE</div>
            {typeRows.map((r) => <Pair key={r.label} row={r} />)}
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "var(--puck-color-text-muted)", padding: "4px 0" }}>PALETTE</div>
            {paletteRows.map((r) => (
              <div key={r.label} style={{ display: "flex", gap: 10, padding: "3px 0", borderTop: "1px solid rgba(139,118,196,.12)" }}>
                <span style={rowLabel}>{r.label}</span>
                <span style={cell}><Swatch hex={r.theirs.split(" ")[0]} />{r.theirs}</span>
                <span style={{ ...cell, color: "var(--puck-color-text)" }}>{r.ours ?? "no token"}</span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "var(--puck-color-text-muted)", padding: "8px 0 4px" }}>BUTTON</div>
            <Pair row={buttonRow} />
          </div>
        </div>
      </header>

      {/* ── the capture: verbatim copy beside its scroll-series shots ── */}
      <main style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 28, padding: "22px 20px 60px", alignItems: "start" }}>
        <article style={{ minWidth: 0 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 18, color: "var(--puck-color-text)" }}>{entry.title}</h1>
          <p style={{ margin: "0 0 14px", fontSize: 11, fontFamily: MONO, color: "var(--puck-color-text-muted)" }}>
            {RECON_ROOT}/{entry.md} · verbatim · read-only
          </p>
          {md === null ? (
            <p style={{ fontSize: 12, color: "var(--err)" }}>the capture file is missing from the vault — the recon commit is incomplete</p>
          ) : (
            <div style={{ maxWidth: 720 }}>
              <Markdown source={md} />
            </div>
          )}
        </article>
        <aside style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "var(--puck-color-text-muted)", marginBottom: 8 }}>
            SCROLL SERIES · {entry.shots.length} shot{entry.shots.length === 1 ? "" : "s"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {entry.shots.map((shot) => (
              <figure key={shot} style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- operator-gated recon route, not a public asset */}
                <img
                  src={`/api/recon-img?path=${encodeURIComponent(shot)}`}
                  alt={`${entry.title} — capture shot ${shot.split("/").pop()}`}
                  style={{ width: "100%", height: "auto", borderRadius: 10, border: "1px solid rgba(139,118,196,.3)", background: "#000" }}
                />
                <figcaption style={{ fontSize: 10.5, fontFamily: MONO, color: "var(--puck-color-text-muted)", marginTop: 4 }}>{shot}</figcaption>
              </figure>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
