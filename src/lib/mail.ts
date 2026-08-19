import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

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

export function brandShell(bodyHtml: string, opts?: { unsubscribeUrl?: string }): string {
  const footer = opts?.unsubscribeUrl
    ? `<p style="margin-top:28px;font-size:12px;color:#8a8494;">You are receiving this because you joined the One Cocreation list. <a href="${opts.unsubscribeUrl}" style="color:#8a8494;">Unsubscribe</a> any time.</p>`
    : "";
  /* S2: the wordmark's gold span stays literal — decorative gold awaits the
     taste-maker's ruling (gold law). */
  /* S2: everything else here stays literal — inboxes don't resolve var()
     (integrator ruling 0018.05.25 a₿); --mail-* remains the cartridge.css
     palette record. */
  return `<!doctype html><html><body style="margin:0;padding:0;background:#faf7f2;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;color:#2b2733;">
  <div style="text-align:center;padding-bottom:20px;border-bottom:1px solid #e8e2d8;">
    <img src="https://onecocreation-adminpacmans-projects.vercel.app/brand/onecocreation-mark.svg" width="44" height="44" alt="" style="vertical-align:middle;margin-right:10px"/><span style="font-size:20px;letter-spacing:.12em;color:#2b2733;vertical-align:middle;">ONE <span style="color:#b4862b;">Cocreation</span></span>
  </div>
  <div style="padding-top:24px;font-size:15px;line-height:1.65;">${bodyHtml}</div>
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e8e2d8;text-align:center;font-size:12px;color:#8a8494;">
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

const SITE = "https://onecocreation-adminpacmans-projects.vercel.app";
const abs = (u: string) => (u.startsWith("http") ? u : `${SITE}${u}`);

/** The bulletproof pill: a real table cell with bgcolor — survives clients
 *  that strip <a> styling (the Admiral's "just words" report, 0018.05.18). */
export function pill(href: string, label: string, size: "sm" | "lg" = "sm"): string {
  const pad = size === "lg" ? "13px 30px" : "10px 24px";
  const fs = size === "lg" ? "15px" : "13px";
  /* S2: gold pill + white ink stay literal — decorative gold awaits a ruling
     (gold law), no --white token exists, and richShell's unsubscribe re-color
     string-matches "#b4862b". */
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;"><tr>
    <td bgcolor="#b4862b" style="border-radius:999px;background:#b4862b;">
      <a href="${abs(href)}" style="display:inline-block;padding:${pad};font-family:Arial,sans-serif;font-size:${fs};color:#ffffff;text-decoration:none;border-radius:999px;"><font color="#ffffff">${label}</font></a>
    </td></tr></table>`;
}

export function richShell(letter: RichLetter): string {
  const cards = (letter.sections ?? [])
    .map(
      (c) => `
  <tr><td style="padding:14px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${c.image ? `<td width="180" valign="top" style="padding-right:18px;"><a href="${abs(c.href)}"><img src="${abs(c.image)}" width="180" alt="" style="display:block;width:180px;border-radius:10px;"/></a></td>` : ""}
      <td valign="top">
        <p style="margin:0 0 6px;font-size:17px;color:#2b2733;"><b>${c.title}</b></p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6b6478;">${c.blurb}</p>
        ${pill(c.href, "Read More")}
      </td>
    </tr></table>
  </td></tr>`
    )
    .join("");

  /* S2: kept literal — #f4f0e9 (shell ground; near --mail-ground but not on
     the approved harmonize list), #ffffff (no --white token), and #ECE3C9 on
     the always-night --mail-deep bar (var(--ghost-ink) would flip dark-on-dark
     at dawn). All need a ruling. */
  /* S2: the --mail-* / --field-ink mappings here reverted to literal —
     inboxes don't resolve var() (integrator ruling 0018.05.25 a₿); --mail-*
     stays defined in cartridge.css as the documented palette record. The
     unsubscribe re-color keys off "#b4862b", which pill() keeps literal. */
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f0e9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0e9;"><tr><td align="center" style="padding:18px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <tr><td style="background:#0e0c18;padding:14px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><a href="${SITE}"><img src="${SITE}/brand/onecocreation-lockup-email.png" height="42" alt="One Cocreation" style="display:block;height:42px;border:0;color:#ECE3C9;font-family:Arial,sans-serif;"/></a></td>
      <td align="right"><a href="${SITE}/memberships" style="color:#ECE3C9;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.06em;text-decoration:none;">MEMBERSHIPS</a></td>
    </tr></table>
  </td></tr>
  ${letter.heroUrl ? `<tr><td style="background:#0e0c18;"><a href="${SITE}"><img src="${abs(letter.heroUrl)}" width="600" alt="" style="display:block;width:100%;"/></a></td></tr>` : ""}
  <tr><td style="padding:30px 34px 8px;font-size:15px;line-height:1.75;color:#2b2733;">${letter.bodyHtml}</td></tr>
  ${cards ? `<tr><td style="padding:6px 34px 8px;"><p style="margin:14px 0 4px;font-size:24px;color:#2b2733;"><b>Check out</b></p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table></td></tr>` : ""}
  ${letter.cta ? `<tr><td align="center" style="padding:26px 34px 34px;"><p style="margin:0 0 14px;font-size:22px;color:#2b2733;"><b>Want to read more?</b></p>${pill(letter.cta.href, letter.cta.label, "lg")}</td></tr>` : ""}
  <tr><td bgcolor="#efe9df" style="background:#efe9df;padding:22px 34px;">
    <img src="${SITE}/brand/onecocreation-mark-email.png" width="40" height="40" alt="✦" style="display:block;margin-bottom:8px;border:0;"/>
    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#4a4458;">
      <b>One Cocreation</b> · Where Heaven and Earth Meet
    </p>
    <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b6478;">
      <a href="${SITE}" style="color:#6b6478;">OneCocreation</a>
      ${letter.webUrl ? ` &nbsp;|&nbsp; <a href="${abs(letter.webUrl)}" style="color:#6b6478;">View on the site</a>` : ""}
    </p>
    ${letter.unsubscribeUrl ? `<p style="margin:14px 0 0;">${pill(letter.unsubscribeUrl, "Unsubscribe", "sm").replace("#b4862b", "#8a8494").replace("#b4862b", "#8a8494")}</p>` : ""}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
