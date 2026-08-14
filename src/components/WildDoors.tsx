/**
 * WHERE PAY IT FORWARD FLOWS — Love's beings (her word, 0018.05.15):
 * "The White Lions are the heart of the earth, the rainforests are the
 * lungs." Each card is a habitat; hover and the being grows out of its
 * cell, life springing up around it. Doors without a trusted link yet say
 * so honestly.
 */

const DOORS = [
  {
    key: "lions",
    beast: "🦁",
    sprouts: ["🌾", "🌾"],
    ground: "linear-gradient(180deg,#f9ecca 0%,#eccf8f 55%,#d9a95c 100%)",
    title: "The White Lions",
    words: "the heart of the Earth — the Global White Lion Protection Trust",
    // Love's word, 0018.05.15: the Capstone Community door supports the
    // lions directly
    href: "https://whitelions.org/capstone-community-2026/",
    cta: "Give to the lions ↗",
  },
  {
    key: "rainforest",
    beast: "🌳",
    sprouts: ["🌿", "🦜"],
    ground: "linear-gradient(180deg,#e2f0da 0%,#a8cd9c 55%,#6f9e6e 100%)",
    title: "The Rainforests",
    words: "the lungs of the Earth",
    href: null,
    cta: "door coming — Love is choosing a trusted one",
  },
  {
    key: "elephants",
    beast: "🐘",
    sprouts: ["🌿", "💧"],
    ground: "linear-gradient(180deg,#ece4f4 0%,#cdbfdf 55%,#a493c0 100%)",
    title: "The Elephants",
    words: "the great rememberers",
    href: null,
    cta: "door coming — being looked into",
  },
] as const;

export default function WildDoors() {
  return (
    <div className="wild-grid">
      {DOORS.map((d) => {
        const inner = (
          <>
            <div className="habitat">
              <span className="ground"><i style={{ background: d.ground }} /></span>
              <span className="sprout sprout--l">{d.sprouts[0]}</span>
              <span className="beast">{d.beast}</span>
              <span className="sprout sprout--r">{d.sprouts[1]}</span>
            </div>
            <div className="wild-body">
              <h3>{d.title}</h3>
              <p>{d.words}</p>
              <span className={`wild-cta${d.href ? "" : " wild-cta--soon"}`}>{d.cta}</span>
            </div>
          </>
        );
        return d.href ? (
          <a key={d.key} className="wild-card" href={d.href} target="_blank" rel="noreferrer">
            {inner}
          </a>
        ) : (
          <div key={d.key} className="wild-card wild-card--soon">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
