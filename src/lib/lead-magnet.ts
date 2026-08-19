import { unsubscribeUrl, siteBase } from "@/lib/subscribers";
import { sendMail, brandShell } from "@/lib/mail";
import { enqueue } from "@/lib/mail-queue";
import { getLetterOverride, bodyToHtml } from "@/lib/letters";

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
