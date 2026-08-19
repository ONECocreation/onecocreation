import SubscribeForm from "@/components/SubscribeForm";
import ContactForm from "@/components/ContactForm";

/**
 * FormDoors (STUDIO P3 — the form block, scope-fenced): ONE block that
 * binds the two form doors that already exist — the letters
 * (SubscribeForm → /api/subscribe) and writing to Love (ContactForm →
 * /api/contact). Existing doors only: no general mail-queue door this
 * arc, and Love's captured pages show no third target. The block picks
 * a door; the machinery underneath is untouched.
 *
 * The letters button label is a field whose default is the site's quieter
 * voice (Pac's FREE ruling, 0018.05.26) — SubscribeForm's own default
 * wording is unchanged for the surfaces that already use it.
 */

interface FormDoorsProps {
  door: "letters" | "contact";
  heading: string;
  cta: string;
}

export function createFormDoors() {
  return {
    label: "Form — the two doors (letters / contact)",
    fields: {
      door: {
        type: "radio" as const,
        label: "Which door",
        options: [
          { label: "Join the letters", value: "letters" },
          { label: "Write to Love", value: "contact" },
        ],
      },
      heading: { type: "text" as const, label: "Heading (optional)" },
      cta: { type: "text" as const, label: "Letters button label" },
    },
    defaultProps: { door: "letters", heading: "", cta: "Send my meditation" },
    render: ({ door, heading, cta }: FormDoorsProps) => (
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        {heading ? <h3 className="sec-h" style={{ fontSize: "1.35rem", marginBottom: ".5rem" }}>{heading}</h3> : null}
        {door === "contact" ? <ContactForm /> : <SubscribeForm source="puck" cta={cta} />}
      </div>
    ),
  };
}
