"use client";

import { useEffect, useState } from "react";
import { SCRIM_LIGHTBOX } from "@/components/Sheet";

/* eslint-disable @next/next/no-img-element */

/**
 * THE LIGHTBOX (0018.05.15): tap any product shot and it opens full and
 * luminous over the page — arrows walk the gallery, Escape or a tap
 * outside closes. The hero image invites the tap with a gentle zoom.
 */
export default function ImageLightbox({ images, title }: { images: string[]; title: string }) {
  const [at, setAt] = useState<number | null>(null);

  useEffect(() => {
    if (at === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAt(null);
      if (e.key === "ArrowRight") setAt((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setAt((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, images.length]);

  if (images.length === 0) return null;

  return (
    <div style={{ margin: "18px 0 0" }}>
      <button
        onClick={() => setAt(0)}
        style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none",
          cursor: "zoom-in", borderRadius: 20, overflow: "hidden",
          boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)" }}
        aria-label={`see ${title} larger`}
      >
        <img src={images[0]} alt={title}
          style={{ width: "100%", display: "block", objectFit: "contain",
            transition: "transform .6s cubic-bezier(.22,1,.36,1)" }}
          onMouseOver={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1.04)"; }}
          onMouseOut={(e) => { (e.target as HTMLImageElement).style.transform = "none"; }}
        />
      </button>
      {images.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {images.slice(1).map((url, i) => (
            <button key={url} onClick={() => setAt(i + 1)}
              style={{ padding: 0, border: "1px solid rgba(139,118,196,.3)", borderRadius: 12,
                overflow: "hidden", cursor: "zoom-in", background: "none" }}
              aria-label={`see view ${i + 2} larger`}>
              <img src={url} alt={`${title} — view ${i + 2}`}
                style={{ width: 84, height: 84, objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}

      {at !== null && (
        /* full-bleed image stays its own creature — but the scrim and the
           z rung are the shared ones (cartridge walk step 6) */
        <div
          onClick={() => setAt(null)}
          style={{ position: "fixed", inset: 0,
            zIndex: "var(--z-lightbox, 80)" as unknown as number, background: SCRIM_LIGHTBOX,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            cursor: "zoom-out" }}
        >
          <img src={images[at]} alt={`${title} — large view`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(94vw, 1000px)", maxHeight: "86vh", objectFit: "contain",
              borderRadius: 16, boxShadow: "0 30px 90px rgba(0,0,0,.5)" }} />
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setAt((at - 1 + images.length) % images.length); }}
                aria-label="previous image" className="btn-round"
                style={{ "--size": "44px", position: "absolute", left: 16, top: "50%",
                  transform: "translateY(-50%)", fontSize: "1.3rem" } as React.CSSProperties}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); setAt((at + 1) % images.length); }}
                aria-label="next image" className="btn-round"
                style={{ "--size": "44px", position: "absolute", right: 16, top: "50%",
                  transform: "translateY(-50%)", fontSize: "1.3rem" } as React.CSSProperties}>›</button>
            </>
          )}
          <button onClick={() => setAt(null)} aria-label="close" className="btn-round"
            style={{ position: "absolute", top: 16, right: 16 }}>✕</button>
        </div>
      )}
    </div>
  );
}
