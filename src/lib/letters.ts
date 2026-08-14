import { brandShell, richShell, type LetterSection } from "./mail";
/**
 * LETTER TEMPLATES (Letters room, wireframe v2): editable copies of the
 * news-side letters live in the vault; the senders read the override first
 * and fall back to the built-in words. Transactional letters (sign-in code,
 * booking confirmation) stay code-built for now — their variables are
 * load-bearing.
 */
/** Who a letter shows itself to on the SITE (Admiral, 0018.05.15):
 *  public = the open news feed (/news + the guest recent-feed);
 *  members = only readers who actually received it (their /letters). */
export type LetterAudience = "public" | "members";

export interface LetterOverride {
  subject: string;
  /** plain paragraphs — blank line = paragraph break; rendered into the
   *  brand shell (bold/bullets arrive with the rich editor pass) */
  body: string;
  audience?: LetterAudience;
}

export const EDITABLE_LETTERS = [
  "lead-magnet",
  "welcome-day-two",
  "news-sample",
  "offer-love-notify",
  "pwyc-accept",
  "pwyc-decline",
] as const;
export type LetterKey = (typeof EDITABLE_LETTERS)[number];

export const DEFAULT_AUDIENCE: Record<LetterKey, LetterAudience> = {
  "lead-magnet": "members",
  "welcome-day-two": "members",
  "news-sample": "public",
  // the offer letters are one-soul mail — never the open feed
  "offer-love-notify": "members",
  "pwyc-accept": "members",
  "pwyc-decline": "members",
};

export function audienceOf(k: LetterKey, override: LetterOverride | null): LetterAudience {
  return override?.audience ?? DEFAULT_AUDIENCE[k] ?? "members";
}

/** Built-in words for letters with no override yet — the news sample keeps
 *  the Admiral's test blocking visible so Love can SEE the layout. Directive
 *  lines shape the rich shell:
 *    !hero: /images/…            — the big picture up top
 *    !section: Title | /img | /link | blurb    — one feature card
 *    !cta: Label | /link         — the big button at the end
 *  Plain paragraphs flow as the greeting/body. */
export const LETTER_DEFAULTS: Partial<Record<LetterKey, LetterOverride>> = {
  "lead-magnet": {
    subject: "Your free meditation — Unzip Into the New You",
    body: `Welcome, beautiful soul.

Here is your free guided meditation, with love:

[▶ Unzip Into the New You](https://onecocreation-adminpacmans-projects.vercel.app/audio/unzip-into-the-new-you.mp3)

Save it, return to it, share the stillness. A weekly note of inspiration will find you here from now on.

With love,
One Cocreation`,
  },
  "welcome-day-two": {
    subject: "Welcome to the field — a note from One Cocreation",
    body: `Beautiful soul — welcome, truly.

Yesterday you received your meditation; today is just a hello. This field is a gathering of people saying YES to themselves, and you belong here.

When you're ready: the memberships open the weekly rhythm, and the free meditation is yours forever either way.

(PLACEHOLDER VOICE — awaiting Love's own words.)

With love,
One Cocreation`,
  },
  "news-sample": {
    subject: "Greetings and Cheers — from One Cocreation",
    body: `!hero: /images/heaven-earth.webp

Greetings and Cheers!

Thank you for saying "YES" to this invitation of Cocreation. IAM thrilled to have you on this journey with us. It is more important then ever to all come together. ONE heart ONE Voice ONE Breath. We ARE more Connected then Separate. Deep within the voice of the heart it is said to hear THE CALL.

You have Answered this Call! Congratulations! We Are the Bridges of the New Way. We are the builders and creators of the path that leads us into unification, a oneness with all. We construct by our thoughts, emotions and actions. Here you will remember to get familiar with and use the tools you have most likely already been given.

IAM here for you to remember the greatness that you ARE and have ALWAYS Been.

!section: Visiting Artists | /images/cut-1.jpg | /letters/news-sample | Grab your reader with a stunning email content — visiting artists, gatherings, and what's coming to the studio.
!section: Membership | /images/lions-gate.webp | /memberships | Three ways into the field — each includes everything before it. Your tier gently becomes your key.
!section: You can add a catchy headline for this section | /images/newsletter.webp | /store | Grab your reader with a stunning email content — the store, the meditations, the affirmations.

!cta: Check All News | /letters/news-sample`,
  },
  /* THE OFFER LETTERS (Love's ask, 0018.05.23): the {{slots}} are the
   * machine-built parts — who / the offered lines / the one-tap doors / the
   * refund link. Love moves them around in her own words; a slot she leaves
   * out is appended at the end so nothing load-bearing can be edited away. */
  "offer-love-notify": {
    subject: "💛 An offer on the doorstep",
    body: `Beautiful — someone gave what they could.

{{who}}

{{lines}}

Two doors, one tap each — the desk does the rest and the kind letter goes out on its own:

{{doors}}

These doors stay open seven days; after that (or any time), the offers desk on /a holds the same two buttons.`,
  },
  "pwyc-accept": {
    subject: "Your offer — received with love",
    body: `Your offer was received with love 💛

{{lines}}

It's a yes — everything stands exactly as if you'd paid the listed price. The Pay-It-Forward jar carries the difference; that is what it's for. When you can, pay it forward.

With love,
One Cocreation`,
  },
  "pwyc-decline": {
    subject: "Your offer — and your sats coming back",
    body: `Thank you for your offer 🕊️

{{lines}}

This time it can't be carried — with love, your sats are coming back.

{{refund}}

With love,
One Cocreation`,
  },
};

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`letters: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const key = (k: string) => `letters:tpl:${k}`;

export async function getLetterOverride(k: LetterKey): Promise<LetterOverride | null> {
  try {
    const raw = (await kv(["GET", key(k)])) as string | null;
    return raw ? (JSON.parse(raw) as LetterOverride) : null;
  } catch {
    return null;
  }
}

export async function saveLetterOverride(k: LetterKey, v: LetterOverride | null): Promise<void> {
  if (v === null) await kv(["DEL", key(k)]);
  else await kv(["SET", key(k), JSON.stringify(v)]);
}

/** letter-markdown → shell-ready html: escape first, then **bold**,
 *  *italic*, [text](url), ![alt](image-url), blank-line paragraphs.
 *  Emoji pass through untouched — type them right in. */
/** The rich assembly: directives lift the letter into the news shell;
 *  a directive-free letter keeps riding the plain brand shell. */
export function letterHtml(body: string, opts?: { unsubscribeUrl?: string; webUrl?: string }): string {
  let heroUrl: string | undefined;
  const sections: LetterSection[] = [];
  let cta: { label: string; href: string } | undefined;
  const plain: string[] = [];

  for (const line of body.split("\n")) {
    const t = line.trim();
    const hero = /^!hero:\s*(\S+)/.exec(t);
    const sec = /^!section:\s*([^|]+)\|([^|]*)\|([^|]+)\|(.+)$/.exec(t);
    const c = /^!cta:\s*([^|]+)\|(.+)$/.exec(t);
    if (hero) heroUrl = hero[1];
    else if (sec) sections.push({ title: sec[1].trim(), image: sec[2].trim() || undefined, href: sec[3].trim(), blurb: sec[4].trim() });
    else if (c) cta = { label: c[1].trim(), href: c[2].trim() };
    else plain.push(line);
  }

  const bodyHtml = bodyToHtml(plain.join("\n").trim());
  if (!heroUrl && sections.length === 0 && !cta) {
    return brandShell(bodyHtml, opts);
  }
  return richShell({ heroUrl, bodyHtml, sections, cta, unsubscribeUrl: opts?.unsubscribeUrl, webUrl: opts?.webUrl });
}

export function bodyToHtml(body: string): string {
  const esc = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = esc
    .replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px"/>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" style="color:#b4862b">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*\n]+)\*/g, "<i>$1</i>");
  // inline margins ON the paragraph — site CSS resets and stricter mail
  // clients both eat default margins (the Admiral's no-spacing report)
  return inline
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0)
    .map((p) => `<p style="margin:0 0 1.15em;line-height:1.75;">${p.trim().replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}
