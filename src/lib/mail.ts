import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { siteBase } from "./subscribers";

/**
 * The mail rail (spec: briefings/onecocreation-email-rail.md).
 *
 * Two personas, one SMTP host (the Zap/Plesk relay — already paid, already
 * warmed): `bookings@` speaks for money and time (confirmations, receipts),
 * `news@` speaks for the newsletter. The secret only ever lives in env —
 * the console may SHOW rail status, never the password.
 *
 * The hourly cap is REPUTATION armor, not a panel limit: the relay exists to
 * keep us off spam lists, so we drip under MAIL_HOURLY_CAP (default 100 of
 * Plesk's 250) and raise it only after the domain has warmed. The counter
 * lives in the vault so every serverless instance shares one honest meter.
 */

export type MailPersona = "bookings" | "news";

interface PersonaCreds {
  user: string;
  pass: string;
  from: string;
}

/** Both env spellings are honored — the fleet doctrine names them
 *  SMTP_USER_<PERSONA>/SMTP_PASS_<PERSONA>, but the first paste used
 *  SMTP_NEWS_PASS; renaming a live secret breaks quieter than reading twice. */
function creds(persona: MailPersona): PersonaCreds | null {
  const P = persona.toUpperCase();
  const user = process.env[`SMTP_USER_${P}`];
  const pass = process.env[`SMTP_PASS_${P}`] || process.env[`SMTP_${P}_PASS`];
  if (!user || !pass) return null;
  const from = process.env[`MAIL_FROM_${P}`] || user;
  return { user, pass, from };
}

export function mailConfigured(persona: MailPersona = "bookings"): boolean {
  return !!process.env.SMTP_HOST && creds(persona) !== null;
}

function transportFor(persona: MailPersona): nodemailer.Transporter | null {
  const c = creds(persona);
  // A pasted "https://mail.example.com" is a hostname wearing a coat — SMTP
  // wants it bare. Strip scheme and any stray path/port decoration.
  const host = (process.env.SMTP_HOST || "").replace(/^[a-z]+:\/\//i, "").replace(/[/:].*$/, "");
  if (!c || !host) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: c.user, pass: c.pass },
  });
}

/* ── the hourly meter (vault-backed, shared across instances) ────────────── */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null; // no vault → no meter; transactional mail still flows
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mail meter: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export function hourlyCap(): number {
  return Number(process.env.MAIL_HOURLY_CAP || 100);
}

function hourKey(): string {
  return `mail:sent:${new Date().toISOString().slice(0, 13)}`; // per UTC hour
}

/** How many sends remain in this UTC hour. Infinity when no vault (dev). */
export async function capRemaining(): Promise<number> {
  const sent = Number((await kv(["GET", hourKey()])) ?? 0);
  if (restEnv() === null) return Infinity;
  return Math.max(0, hourlyCap() - sent);
}

async function meterTick(): Promise<void> {
  await kv(["INCR", hourKey()]);
  await kv(["EXPIRE", hourKey(), String(2 * 3600)]);
}

/* ── the one-shot guard (TASK-214) ────────────────────────────────────────
 * Root cause of "the receipt sent 3× on 3 clicks": the send panel had no
 * in-flight guard. The panel now disables itself while a send is running
 * (belt), and this vault-backed guard is the suspenders: the exact same
 * request (same letter, same segment/testTo, same typed count) arriving
 * again inside a short window — a double click that beat the disable, a
 * network retry, a second tab — is refused, not re-queued. `SET NX PX` is
 * the catalog lock's own idiom (catalog-lock.ts). No vault (dev) = the
 * guard always says "go" — the panel's local disable is the only line then,
 * same as every dev-mode fallback in this file. */
export async function onceWithin(key: string, windowMs: number): Promise<boolean> {
  if (restEnv() === null) return true;
  try {
    const res = await kv(["SET", `mail:once:${key}`, "1", "NX", "PX", String(windowMs)]);
    return res === "OK";
  } catch {
    return true; // a broken guard must never block a real send
  }
}

/* ── sending ─────────────────────────────────────────────────────────────── */

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  /** plain-text alternative — generated from html when omitted */
  text?: string;
  attachments?: Mail.Attachment[];
  /** one-click list-unsubscribe target (newsletter law, and just polite) */
  unsubscribeUrl?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Send one mail through a persona's mailbox. Counts against the hourly meter.
 * Throws on missing config or SMTP refusal — callers decide whether a failure
 * is fatal (a blast tick) or swallowed (a booking settle must never die here).
 */
export async function sendMail(persona: MailPersona, mail: OutgoingMail): Promise<void> {
  const transport = transportFor(persona);
  const c = creds(persona);
  if (!transport || !c) throw new Error(`mail rail dark: ${persona} persona not configured`);

  const headers: Record<string, string> = {};
  if (mail.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${mail.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  await transport.sendMail({
    from: `"One Cocreation" <${c.from}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text || stripHtml(mail.html),
    attachments: mail.attachments,
    headers,
  });
  try {
    await meterTick();
  } catch {
    /* a broken meter must not fail a sent mail */
  }
}

/* ── the brand shell (every outgoing mail wears it; Love writes the middle) ── */

/* TASK-214 (the letters desk, 0018.06.23 a₿): the letter arrived on a white
 * ground with the old bare mark + text wordmark — the ONE Cocreation site is
 * dark-first (cartridge.css :root). This shell now wears the same night:
 * --ground #141021 (outer) behind an --mail-panel #2b2733 card (cartridge.css
 * "email card ground"), the raylit lockup's own email PNG (the NEW logo,
 * confirmed live by T-179 — matches richShell's header exactly), and ink
 * from the site's own --ink. Gold-is-money: the decorative gold family here
 * follows T-121's pink pass (rose, not money gold) — --rose #E7B2C3 measures
 * 8-10:1 on both the panel and the ground (contrast math in SUMMARY). S2:
 * every hex stays literal — inboxes don't resolve var() (integrator ruling
 * 0018.05.25 a₿); --ground/--mail-panel/--ink/--rose/--muted are cartridge.css's
 * palette record, quoted here as numbers. */
export function brandShell(bodyHtml: string, opts?: { unsubscribeUrl?: string }): string {
  const footer = opts?.unsubscribeUrl
    ? `<p style="margin-top:28px;font-size:12px;color:#9a8fae;">You are receiving this because you joined the One Cocreation list. <a href="${opts.unsubscribeUrl}" style="color:#E7B2C3;">Unsubscribe</a> any time.</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#141021;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;color:#E9E2F2;background:#2b2733;">
  <div style="text-align:center;padding-bottom:20px;border-bottom:1px solid rgba(139,118,196,.34);">
    <img src="${site()}/brand/onecocreation-lockup-email.png" height="38" alt="One Cocreation" style="display:block;height:38px;margin:0 auto;border:0;"/>
  </div>
  <div style="padding-top:24px;font-size:15px;line-height:1.65;">${bodyHtml}</div>
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(139,118,196,.34);text-align:center;font-size:12px;color:#9a8fae;">
    One Cocreation · onecocreation.com${footer}
  </div>
</div></body></html>`;
}


/* ── THE NEWS SHELL (Admiral's references, 0018.05.18: the Shine-style
   letter — hero, greeting, feature cards with Read More doors, one big
   CTA, the branded footer). Table-based so every mail client behaves. ── */

export interface LetterSection {
  title: string;
  image?: string;
  href: string;
  blurb: string;
  /** the card's door word — default "Open"; the house's old "Read More" retired (Admiral, 0018.06.17) */
  door?: string;
}

export interface RichLetter {
  heroUrl?: string;
  bodyHtml: string;
  sections?: LetterSection[];
  cta?: { label: string; href: string };
  unsubscribeUrl?: string;
  /** the letter's own page on the site — "view in browser" */
  webUrl?: string;
}

/* TASK-105 (0018.06.12 a₿), the point-to-new-site sweep: SITE was the
   literal "https://onecocreation.com", but that DNS still resolves to the
   OLD ShinePages host until Love's cutover — every mail link pointed at the
   old site. All links now resolve through siteBase() (NEXT_PUBLIC_SITE_URL →
   VERCEL_PROJECT_PRODUCTION_URL → localhost), read per call so the env wins
   the moment it's set. The footer's display TEXT "onecocreation.com" is not
   a URL and stays; NIP-05/matrix identity literals elsewhere are identity
   and stay too. */
const site = () => siteBase();
const abs = (u: string) => (u.startsWith("http") ? u : `${site()}${u}`);

/** The bulletproof pill: a real table cell with bgcolor — survives clients
 *  that strip <a> styling (the Admiral's "just words" report, 0018.05.18).
 *  TASK-214: gold-is-money — the CTA fill rides T-121's rose (--rose
 *  #E7B2C3), ink is the pink pass's own --gold-ink #6B2A44 (5.66:1 on that
 *  fill, the exact pairing cartridge.css documents). `variant: "muted"` is
 *  the quieter Unsubscribe pill (--mail-muted-2 #6b6478 fill, white ink,
 *  5.65:1) — a parameter now, not the old double string-replace hack that
 *  broke the moment this fill's own literal changed. */
export function pill(href: string, label: string, size: "sm" | "lg" = "sm", variant: "primary" | "muted" = "primary"): string {
  const pad = size === "lg" ? "13px 30px" : "10px 24px";
  const fs = size === "lg" ? "15px" : "13px";
  const bg = variant === "muted" ? "#6b6478" : "#E7B2C3";
  const ink = variant === "muted" ? "#ffffff" : "#6B2A44";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;"><tr>
    <td bgcolor="${bg}" style="border-radius:999px;background:${bg};">
      <a href="${abs(href)}" style="display:inline-block;padding:${pad};font-family:Arial,sans-serif;font-size:${fs};color:${ink};text-decoration:none;border-radius:999px;"><font color="${ink}">${label}</font></a>
    </td></tr></table>`;
}

/* TASK-214: the card was #ffffff on #f4f0e9 (the second half of the "white
 * ground, wrong color" bug the Admiral saw live) — both now ride the same
 * night the header band already wore (--ground #141021 outer, --mail-panel
 * #2b2733 card; the header/footer bands were already right and stay). Card
 * text/titles take the site's --ink #E9E2F2, blurbs take --muted #9a8fae
 * (4.8:1 on the panel — measured; --mail-muted-2 #6b6478 read 2.6:1 there,
 * too dark for a dark card). The footer band stays its original light cream
 * (#efe9df, unflagged, an intentional sealed-letter close) with its own
 * dark ink, unaffected by the ground change. */
export function richShell(letter: RichLetter): string {
  const cards = (letter.sections ?? [])
    .map(
      (c) => `
  <tr><td style="padding:14px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${c.image ? `<td width="180" valign="top" style="padding-right:18px;"><a href="${abs(c.href)}"><img src="${abs(c.image)}" width="180" alt="" style="display:block;width:180px;border-radius:10px;"/></a></td>` : ""}
      <td valign="top">
        <p style="margin:0 0 6px;font-size:17px;color:#E9E2F2;"><b>${c.title}</b></p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#9a8fae;">${c.blurb}</p>
        ${pill(c.href, c.door ?? "Open")}
      </td>
    </tr></table>
  </td></tr>`
    )
    .join("");

  /* S2: every hex below stays literal — inboxes don't resolve var()
     (integrator ruling 0018.05.25 a₿); --ground/--mail-panel/--ink/--muted/
     --mail-cream-2 are cartridge.css's documented palette record. */
  return `<!doctype html><html><body style="margin:0;padding:0;background:#141021;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141021;"><tr><td align="center" style="padding:18px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#2b2733;font-family:Arial,Helvetica,sans-serif;">
  <tr><td style="background:#0e0c18;padding:14px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><a href="${site()}"><img src="${site()}/brand/onecocreation-lockup-email.png" height="42" alt="One Cocreation" style="display:block;height:42px;border:0;color:#ECE3C9;font-family:Arial,sans-serif;"/></a></td>
      <td align="right"><a href="${site()}/memberships" style="color:#ECE3C9;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.06em;text-decoration:none;">MEMBERSHIPS</a></td>
    </tr></table>
  </td></tr>
  ${letter.heroUrl ? `<tr><td style="background:#0e0c18;"><a href="${site()}"><img src="${abs(letter.heroUrl)}" width="600" alt="" style="display:block;width:100%;"/></a></td></tr>` : ""}
  <tr><td style="padding:30px 34px 8px;font-size:15px;line-height:1.75;color:#E9E2F2;">${letter.bodyHtml}</td></tr>
  ${cards ? `<tr><td style="padding:6px 34px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table></td></tr>` : ""}
  ${letter.cta ? `<tr><td align="center" style="padding:26px 34px 34px;">${pill(letter.cta.href, letter.cta.label, "lg")}</td></tr>` : ""}
  <tr><td bgcolor="#efe9df" style="background:#efe9df;padding:22px 34px;">
    <img src="${site()}/brand/onecocreation-mark-email.png" width="40" height="40" alt="✦" style="display:block;margin-bottom:8px;border:0;"/>
    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#4a4458;">
      <b>One Cocreation</b> · Where Heaven and Earth Meet
    </p>
    <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b6478;">
      <a href="${site()}" style="color:#6b6478;">OneCocreation</a>
      ${letter.webUrl ? ` &nbsp;|&nbsp; <a href="${abs(letter.webUrl)}" style="color:#6b6478;">View on the site</a>` : ""}
    </p>
    ${letter.unsubscribeUrl ? `<p style="margin:14px 0 0;">${pill(letter.unsubscribeUrl, "Unsubscribe", "sm", "muted")}</p>` : ""}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
