"use client";

import { useEffect } from "react";

/**
 * THE SHEET (cartridge walk step 6, Admiral's walk, 0018.05.15): ONE
 * overlay+sheet primitive where four grew wild — glass.tsx, QuickView,
 * the lightbox, and AdminWeekGrid's verbatim re-declaration. The scrim
 * and the z-ladder are law here; every popup closes on Escape AND a tap
 * outside by adoption, not by luck. The sheet surface rides --sheet-bg
 * (night glass in dark, paper in light); deliberate paper surfaces like
 * QuickView pass their own sheetStyle and keep their lit face.
 */

/** the house scrim — every popup dims the room the same way */
export const SCRIM = "rgba(24,18,38,.55)";
/** the lightbox goes deeper — the image earns a darker room */
export const SCRIM_LIGHTBOX = "rgba(14,12,24,.88)";

/* the z-ladder, declared (house.css): sheets under popups under lightbox */
const Z: Record<"sheet" | "popup" | "lightbox", string> = {
  sheet: "var(--z-sheet, 60)",
  popup: "var(--z-popup, 70)",
  lightbox: "var(--z-lightbox, 80)",
};

export default function Sheet({
  open,
  onClose,
  maxWidth = 460,
  z = "sheet",
  scrimStyle,
  sheetStyle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  maxWidth?: number;
  z?: "sheet" | "popup" | "lightbox";
  /** extras for the dimmed room (e.g. QuickView's backdrop blur) */
  scrimStyle?: React.CSSProperties;
  /** overrides for the sheet surface (e.g. deliberate paper) */
  sheetStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z[z] as unknown as number, // CSS var — resolves to the ladder
        background: z === "lightbox" ? SCRIM_LIGHTBOX : SCRIM,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        ...scrimStyle,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--sheet-bg)",
          borderRadius: 16,
          border: "1px solid rgba(139,118,196,.4)",
          boxShadow: "0 18px 50px rgba(24,18,38,.35)",
          padding: 22,
          width: "100%",
          maxWidth,
          maxHeight: "86vh",
          overflowY: "auto",
          ...sheetStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
