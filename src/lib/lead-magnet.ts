import { unsubscribeUrl, siteBase } from "@/lib/subscribers";
import { sendMail, brandShell } from "@/lib/mail";
import { enqueue } from "@/lib/mail-queue";
import { getLetterOverride, bodyToHtml } from "@/lib/letters";
import { getSiteConfig } from "@/lib/site-config";

/**
 * THE WELCOME LETTERS, one home (Love's walk found the gap, 0018.05.15):
 * the newsletter door sent the meditation but the JOIN door only added the
 * subscriber — a member who joined without touching the form never got her
 * gift. Both doors now pour from this jug.
 *
 * S2: the gold CTA pills below stay literal — decorative gold awaits the
 * taste-maker's ruling (gold law); their #fff ink has no token twin.
 */

/** "Unzip Into the New You" — the promise on every form, sent immediately. */
export async function sendLeadMagnetLetter(email: string): Promise<void> {
  const unsub = unsubscribeUrl(email);
  const leadTpl = await getLetterOverride("lead-magnet");
  await sendMail("news", {
    to: email,
    subject: leadTpl?.subject ?? "Your free meditation — Unzip Into the New You",
    html: brandShell(
      leadTpl
        ? bodyToHtml(leadTpl.body) +
          `<p style="margin:22px 0;"><a href="${siteBase()}/audio/unzip-into-the-new-you.mp3"
          style="background:#b4862b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;">
          ▶ Unzip Into the New You</a></p>`
        : `<p>Welcome, beautiful soul.</p>
       <p>Here is your free guided meditation, with love:</p>
       <p style="margin:22px 0;"><a href="${siteBase()}/audio/unzip-into-the-new-you.mp3"
          style="background:#b4862b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;">
          ▶ Unzip Into the New You</a></p>
       <p>Save it, return to it, share the stillness. A weekly note of
       inspiration will find you here from now on.</p>
       <p>With love,<br/>One Cocreation</p>`,
      { unsubscribeUrl: unsub },
    ),
    unsubscribeUrl: unsub,
  });
}

/**
 * READ WITH LOVE (TASK-126, 0018.06.16 a₿; room line TASK-132, 0018.06.17
 * a₿) — the welcome letter for the second square's email door: the weekly
 * live book reading. The room link is built from the site's meeting config
 * (getSiteConfig().meeting, T-129): rail "jitsi" → the house domain with the
 * fixed public room name `read-with-love` (guests wait for Love — she is the
 * moderator, and the letter says so); rail "vdo" → the VDO.Ninja guest link
 * for that same room (same param shape as /meet/[bookingId]); neither → the
 * letter honestly says the link is coming. An OPTIONAL override env
 * READ_WITH_LOVE_ROOM_URL (the TASK-126 env, renamed by TASK-132 — the old
 * name is recorded in .env.example) still wins when set — SERVER-SIDE ONLY
 * (this module never reaches a client bundle). Derive-or-dash: never a fake
 * or placeholder URL, and the value itself is never echoed anywhere but the
 * letter it's meant for. The room is Love's own — no third-party meeting
 * brand appears in this letter. The day-two welcome is skipped for
 * this source — it is about the meditation.
 */
export async function sendReadWithLoveLetter(email: string): Promise<void> {
  const unsub = unsubscribeUrl(email);
  const override = process.env.READ_WITH_LOVE_ROOM_URL?.trim();
  const { meeting } = await getSiteConfig();
  /* a URL from env or the config doc is trusted as the operator's own, but
     it rides an href — escape the two characters that could break the
     attribute */
  const esc = (url: string) => url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const roomUrl = override
    ?? (meeting.rail === "jitsi"
      ? `https://${meeting.jitsiDomain}/read-with-love`
      : meeting.rail === "vdo"
        ? "https://vdo.ninja/?room=read-with-love"
        : null);
  const roomLine = roomUrl
    ? `<p style="margin:22px 0;"><a href="${esc(roomUrl)}"
          style="background:#b4862b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;">
          Join the reading in Love&apos;s room</a></p>
       <p>The room is ours — when you arrive, settle in and wait for me:
       I&apos;ll join as the moderator and we&apos;ll begin together.</p>`
    : `<p>The room link is coming — I&apos;ll send it before the first reading.</p>`;
  await sendMail("news", {
    to: email,
    subject: "Read with Love — your seat",
    html: brandShell(
      `<p>Welcome, beautiful soul — your seat is saved.</p>
       <p>Read with Love is a weekly live book reading: we gather, I read
       aloud, and the field listens together. Bring the book if you have it;
       bring yourself either way.</p>
       ${roomLine}
       <p>With love,<br/>One Cocreation</p>`,
      { unsubscribeUrl: unsub },
    ),
    unsubscribeUrl: unsub,
  });
}

/** The day-two welcome — rides the drip queue, genuinely-new joins only.
 *  Copy is a placeholder shape awaiting Love's own voice (checklist item). */
export async function enqueueDayTwoWelcome(email: string): Promise<void> {
  const unsub = unsubscribeUrl(email);
  const welcomeTpl = await getLetterOverride("welcome-day-two");
  await enqueue([
    {
      to: email,
      notBefore: Date.now() + 24 * 3600 * 1000,
      subject: welcomeTpl?.subject ?? "Welcome to the field — a note from One Cocreation",
      html: brandShell(
        welcomeTpl
          ? bodyToHtml(welcomeTpl.body)
          : `<p>Welcome, beautiful soul — we're so glad you're here.</p>
         <p>Yesterday the meditation found you; today, a little map of the field:</p>
         <p><b>Memberships</b> — three ways in, each holding the one before:
         The Weekly Intuitive, The Observer, and The Evening Star.<br/>
         <b>Sessions</b> — 1:1 time with Love, booked in a few clicks.<br/>
         <b>The store</b> — meditations, affirmations and adornments.<br/>
         <b>Community</b> — the rooms where the field gathers between sessions.</p>
         <p style="margin:22px 0;"><a href="${siteBase()}/packages"
            style="background:#b4862b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;">
            Step into the field</a></p>
         <p>With love,<br/>One Cocreation</p>`,
        { unsubscribeUrl: unsub },
      ),
    },
  ]);
}
