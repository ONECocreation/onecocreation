import SubscribeForm from "./SubscribeForm";

/**
 * READ WITH LOVE (TASK-120, 0018.06.16 a₿) — the second square: Love's
 * weekly live book reading. The door asks only for an email. The Zoom link
 * is NEVER on this page — it lives in env READ_WITH_LOVE_ZOOM_URL and is
 * used server-side by the welcome letter alone; unset, the letter says
 * "link coming" (derive-or-dash — never a fake link, never the URL in
 * page markup).
 */
export default function ReadWithLove() {
  return (
    <div className="wild-card">
      <div className="habitat">
        <span className="ground">
          <i style={{ background: "linear-gradient(180deg,#ece4f4 0%,#cdbfdf 55%,#a493c0 100%)" }} />
        </span>
        <span className="sprout sprout--l">🌿</span>
        <span className="beast">📖</span>
        <span className="sprout sprout--r">💧</span>
      </div>
      <div className="wild-body">
        <h3>Read with Love</h3>
        <p>Join me weekly for a live book reading — put in your email and I&apos;ll send the Zoom link.</p>
        <SubscribeForm
          source="readwithlove"
          cta="Read with me"
          note="The Zoom link arrives by letter — the page itself never carries it."
        />
      </div>
    </div>
  );
}
