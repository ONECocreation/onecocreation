"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/kit";
import { directivesOf, editableIndexes, textToDoc, type LetterDoc, type LetterModel } from "@/lib/letter-model";

/* the editor loads on this page only, in the browser only */
const TextBlock = dynamic(() => import("./TextBlock"), {
  ssr: false,
  loading: () => <p className="kit-note">Loading the editor...</p>,
});

/**
 * T-604 (letters 553a): the letter drawn as the mail draws it, in the legacy
 * order the mail uses today: header, hero, ALL the words, ALL the cards, the
 * one button, footer. It is a CSS mimic (mail.ts richShell is the truth; the
 * page offers the server's own render beside it). Only the words are
 * editable; the header, footer, picture, cards and button are fixed parts in
 * this part of the work and are labelled so.
 */
const FIXED_MIDDLE = "Picture, cards and button: changed in the next part, kept exactly as written";

export interface LetterCanvasProps {
  model: LetterModel;
  /** a seeded letter's footer also carries "View on the site" */
  seeded: boolean;
  /** a text block (segment index) was edited */
  onEdit: (segmentIndex: number, doc: LetterDoc) => void;
  /** plain reasons per segment index */
  problems: Record<number, string>;
  /** a letter of directive lines only has no words block yet */
  onAddWords: () => void;
}

export default function LetterCanvas({ model, seeded, onEdit, problems, onAddWords }: LetterCanvasProps) {
  const { hero, cards, cta } = directivesOf(model);
  const blocks = editableIndexes(model);
  return (
    <div className="kitx-ground oc-pv-dark">
      <div className="kitx-letter">
        <div className="kitx-letter-head">
          <div>
            <p className="kicker">Fixed part: the header</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/onecocreation-lockup-email.png" alt="One Cocreation" />
          </div>
          <b>MEMBERSHIPS</b>
        </div>
        {hero && (
          <div className="kitx-letter-fixed">
            <p className="kicker">{FIXED_MIDDLE}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" />
          </div>
        )}
        <div className="kitx-letter-text">
          {blocks.map((i) => {
            const seg = model.segments[i];
            if (seg.kind !== "text") return null;
            return <TextBlock key={i} id={`letter-block-${i}`} doc={textToDoc(seg.lines)} problem={problems[i]} onChange={(d) => onEdit(i, d)} />;
          })}
          {blocks.length === 0 && (
            <Button sm variant="second" onClick={onAddWords}>Add words</Button>
          )}
        </div>
        {cards.length > 0 && (
          <div className="kitx-letter-cards">
            <p className="kicker">{FIXED_MIDDLE}</p>
            {cards.map((c, n) => (
              <div className="kitx-letter-card" key={n}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.image ? <img src={c.image} alt="" /> : null}
                <div>
                  <p>{c.title}</p>
                  <p className="kit-note">{c.blurb}</p>
                  <span className="kit-btn kit-btn-main kit-btn-sm" aria-hidden="true">Open</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {cta && (
          <div className="kitx-letter-fixed">
            <p className="kicker">{FIXED_MIDDLE}</p>
            <div className="kitx-letter-cta">
              <span className="kit-btn kit-btn-main kit-btn-sm" aria-hidden="true">{cta.label}</span>
            </div>
          </div>
        )}
        <div className="kitx-letter-foot">
          <p className="kicker">Fixed part: the footer</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/onecocreation-mark-email.png" alt="" />
          <p><b>One Cocreation</b> · Where Heaven and Earth Meet</p>
          <p>
            <small>OneCocreation{seeded ? " | View on the site" : ""}</small>
          </p>
          <span className="kit-btn kit-btn-second kit-btn-sm" aria-hidden="true">Unsubscribe</span>
        </div>
      </div>
    </div>
  );
}
