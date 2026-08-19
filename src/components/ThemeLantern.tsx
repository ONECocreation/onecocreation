"use client";

import { useEffect, useState } from "react";

/**
 * THE SUN WITH SHADES (Admiral, 0018.05.17 — succeeds the lantern): the
 * theme toggle lives in the header by the login name. Dark mode = the sun
 * wearing its shades ("easy on the eyes?"); light mode = shades off, full
 * shine. Choice keeps itself in localStorage; the boot script in layout
 * applies it before first paint.
 */
export default function ThemeLantern() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.getAttribute("data-oc-theme") === "light");
  }, []);

  function flip() {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.setAttribute("data-oc-theme", "light");
    else document.documentElement.removeAttribute("data-oc-theme");
    try { localStorage.setItem("oc-theme", next ? "light" : "dark"); } catch { /* private mode */ }
  }

  const shadesOn = !light; // dark mode: the sun keeps it easy on the eyes
  return (
    <button
      className="theme-sun"
      onClick={flip}
      aria-label={shadesOn ? "shades off — let there be light" : "easy on the eyes? shades on"}
      title="easy on the eyes?"
    >
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        {/* rays */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          const x1 = 13 + Math.cos(a) * 9.2, y1 = 13 + Math.sin(a) * 9.2;
          const x2 = 13 + Math.cos(a) * 12, y2 = 13 + Math.sin(a) * 12;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />;
        })}
        {/* the sun itself */}
        <circle cx="13" cy="13" r="6.4" fill="currentColor" />
        {shadesOn && (
          <g>
            {/* the shades: two lenses + bridge, riding the sun's brow */}
            <rect x="7.4" y="10.4" width="4.7" height="3.5" rx="1.6" fill="var(--ground)" />
            <rect x="13.9" y="10.4" width="4.7" height="3.5" rx="1.6" fill="var(--ground)" />
            <line x1="12.1" y1="11.6" x2="13.9" y2="11.6" stroke="var(--ground)" strokeWidth="1.4" />
            <line x1="7.4" y1="11.2" x2="5.6" y2="10.4" stroke="var(--ground)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="18.6" y1="11.2" x2="20.4" y2="10.4" stroke="var(--ground)" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </button>
  );
}
