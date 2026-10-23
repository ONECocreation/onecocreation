import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import QuestionsBox from "./QuestionsBox";

/**
 * /qa/questions — the question box the letter's "Intuitive Q&A questions"
 * button opens: the site header, one short card, the thank-you state after
 * send. Kit parts only (Card shell via .card .kit-signup, Field, Button);
 * the ONE new rule is kit.css's kitx-form-col (layout only, the round-2
 * mark: "make the boxes bigger and or center the text in the card").
 *
 * Round 1's overflow lesson is baked in: kit-signup's centered flex body
 * sizes a plain form to max-content and the form escaped the card at 390
 * (measured 385px in a 296px body). kitx-form-col gives the form a definite
 * width (min(560px, 100%)), so at phone width it takes exactly the body,
 * never more.
 */

export const metadata: Metadata = {
  title: "Intuitive Q&A questions",
  description: "Send your question for this month's Intuitive Q&A with Love.",
};

export default function QaQuestionsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="kitx-section kitx-section-first">
          <div className="wrap">
            <div className="card kit-signup">
              <div className="kit-card-body">
                <QuestionsBox />
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
