/**
 * THE BASKET'S CONTACT LINE, SAID ONCE (TASK-210, 0018.06.23 a₿ — Love's
 * 0018.06.18 call: "the basket asks for an email while the visitor is
 * signed in"). Pure — the house pins the model, not the render (BuyPanel's
 * T-177 precedent, one step further: the basket asked for nothing about the
 * visitor; now it reads the same session the header does).
 *
 *  · no session → the field shows; whatever was typed rides along.
 *  · an EMAIL member → NO field: the receipt goes to the mailbox that
 *    answered the code, and the line says who the site knows them as.
 *  · a KEY member → the field stays (a signer has no mailbox on file), but
 *    the line names the soul and the ask is plainly optional — never
 *    "sign in" to someone already in.
 */
export interface ContactSession {
  handle: string;
  space: string;
  /** the known-by name — who the member IS, never the raw mailbox */
  name: string;
}

export interface BasketContact {
  /** render the email field? */
  askEmail: boolean;
  /** the contact email the checkout carries (typed, or the session's own) */
  email: string | null;
  /** the signed-in line under the fields — null for a guest */
  line: string | null;
}

export function basketContact(session: ContactSession | null, typed: string): BasketContact {
  const clean = typed.trim() || null;
  if (!session) return { askEmail: true, email: clean, line: null };
  if (session.space === "email") {
    return {
      askEmail: false,
      email: session.handle,
      line: `Signed in as ${session.name} — your receipt goes to ${session.handle}.`,
    };
  }
  return {
    askEmail: true,
    email: clean,
    line: `Signed in as ${session.name} — add an email only if you'd like a receipt.`,
  };
}

/** The gated-item line: a guest is invited in, a member is simply told what
 *  unlocks for THEM — never asked to sign in again. */
export function basketGatedLine(session: ContactSession | null): string {
  return session
    ? `part of this basket unlocks for your account, ${session.name} — it's yours the moment the payment lands.`
    : "part of this basket unlocks for your account — sign in, or just add your email below: it becomes your account.";
}
