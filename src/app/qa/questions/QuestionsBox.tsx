"use client";

import { useState } from "react";
import Field from "@/components/kit/Field";
import Button from "@/components/kit/Button";

/**
 * THE INTUITIVE Q&A QUESTION BOX (TASK-603 phase 2, K182 — his Desk answer
 * on card 971566: "Build it (Studio menu)"). The box ruling (block 971,255):
 * A, a question box ON THE SITE. Sends ride POST /api/qa/questions — no
 * account needed, the name and email optional, the month-keyed store and
 * Love's notice server-side.
 *
 * Kit parts only: Field, Button, the kit-field/kit-note classes, and the
 * kitx-form-col column (kit.css — centered, wider boxes; his round-2 mark
 * on 02-dawn-1440). Her hint is her own sentence from the letter paragraph
 * (WORDS.md, "The Intuitive Q&A words"). The button wears the `sm` rung: at
 * the kit's 1.5rem main size the full label measures 385px wide (R-071
 * keeps it on one line) and overflows a phone-width card body — measured
 * in round 1, not eyeballed.
 *
 * The thank-you reads as ONE centered paragraph (his round-2 pin: the
 * second line joins the first sentence, one font, the whole block
 * centered). A failed send keeps the form and says why in plain words.
 */
export default function QuestionsBox() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/qa/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          question: String(data.get("question") ?? ""),
          company: String(data.get("company") ?? ""),
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (res.ok && body?.ok) {
        form.reset();
        setSent(true);
      } else {
        setErr(body?.reason ?? "the questions box didn't take it - please try again in a little while");
      }
    } catch {
      setErr("the questions box didn't answer - please try again in a little while");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="kitx-form-col">
        <div>
          <p className="kicker">The Intuitive Q&amp;A</p>
          <h2 className="kit-h2">Thank you</h2>
          <p className="kit-text-quiet">
            Your question is with Love. A few questions are taken on stage at the end of the month, in a sacred
            place of breath and stillness. You can send another any time; this box stays open all month.
          </p>
        </div>
        <div>
          <Button variant="second" sm onClick={() => setSent(false)}>
            Send another question
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="kicker">The Intuitive Q&amp;A</p>
      <h2 className="kit-h2">Ask your question</h2>
      <p className="kit-text-quiet">
        Once a month, at the end of the month, Love takes a few of these on stage. Send yours ahead, right here.
      </p>
      <form className="kitx-form-col" onSubmit={send}>
        <Field id="qa-name" name="name" label="Your name (optional)" autoComplete="name" />
        <Field id="qa-email" name="email" label="Your email (optional)" type="email" autoComplete="email" />
        <div className="kit-field">
          <label className="kit-field-label" htmlFor="qa-question">
            Your question
          </label>
          <textarea
            className="kit-field-input"
            id="qa-question"
            name="question"
            rows={5}
            required
            aria-describedby="qa-question-hint"
          />
          <p className="kit-note" id="qa-question-hint">
            Please adjust your questions to be more in general as opposed to personal, so that it may benefit the
            whole collective that arrive for the Q&amp;A.
          </p>
        </div>
        {/* the honeypot — bots fill it, souls don't (the contact form's own idiom) */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" placeholder="company"
          aria-hidden style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
        {err && (
          <p className="kit-note" role="alert">
            {err}
          </p>
        )}
        <div>
          <Button type="submit" sm disabled={busy}>
            {busy ? "Sending…" : "Send your question"}
          </Button>
        </div>
        <p className="kit-note">no account needed; leave the name and email blank to ask without them</p>
      </form>
    </>
  );
}
