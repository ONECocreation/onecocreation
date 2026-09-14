/**
 * THE SIX SCENES (TASK-191 + TASK-244) — T-191's three ON-CAMERA overlays
 * (solo/duo/phone, `kind: "overlay"`, transparent, laid over the real
 * camera picture) plus TASK-244's three FULL-FRAME scenes (`kind: "full"`,
 * opaque, the whole 1920×1080 themselves — starting soon, be right back,
 * thank you). `kind` is the only new field on the old three rows; their
 * render is untouched. This list is the ONE source both ends read: the
 * /a/studio room builds its picker chips and per-scene URLs from it, the
 * /studio/overlay route validates its ?scene= against it AND picks
 * OverlayStage vs FullScene by `kind` — a seventh scene joins by adding one
 * row here, never by hunting literals. Template-shaped: the labels name
 * the SHOT, never the brand.
 */

export const STUDIO_SCENES = [
  { id: "solo", label: "Solo + runner", blurb: "the host full-frame, the runner along the foot", kind: "overlay" },
  { id: "duo", label: "Side by side", blurb: "the host and the first guest, paired lower thirds", kind: "overlay" },
  { id: "phone", label: "Phone go-live", blurb: "a caller on the line — the guest's lower third leads", kind: "overlay" },
  { id: "starting", label: "Starting soon", blurb: "the book picture, the show title, a countdown to go-live", kind: "full" },
  { id: "brb", label: "Be right back", blurb: "a short pause — the mark and a breath", kind: "full" },
  { id: "ending", label: "Thank you", blurb: "the closing card — the after-hours line and the door home", kind: "full" },
] as const;

export type StudioSceneId = (typeof STUDIO_SCENES)[number]["id"];
export type StudioSceneKind = (typeof STUDIO_SCENES)[number]["kind"];

export function isStudioScene(v: unknown): v is StudioSceneId {
  return typeof v === "string" && (STUDIO_SCENES as readonly { id: string }[]).some((s) => s.id === v);
}

/** A scene's kind, or null for an id this list doesn't carry — the
 *  overlay route's one branch point (OverlayStage vs FullScene). */
export function studioSceneKind(id: StudioSceneId): StudioSceneKind {
  return (STUDIO_SCENES as readonly { id: string; kind: StudioSceneKind }[]).find((s) => s.id === id)!.kind;
}
