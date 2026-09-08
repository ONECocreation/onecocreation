/**
 * THE THREE SCENES (TASK-191, 0018.06.18 a₿ · block 966119) — the Admiral's
 * ruling: three scenes first — the host solo with the runner, the host and
 * a guest side by side, and the phone go-live. The pictures are VDO's; the
 * overlay is ours and universal. This list is the ONE source both ends
 * read: the /a/studio room builds its picker chips and per-scene URLs from
 * it, the /studio/overlay route validates its ?scene= against it — a
 * fourth scene joins by adding one row here, never by hunting literals.
 * Template-shaped: the labels name the SHOT, never the brand.
 */

export const STUDIO_SCENES = [
  { id: "solo", label: "Solo + runner", blurb: "the host full-frame, the runner along the foot" },
  { id: "duo", label: "Side by side", blurb: "the host and the first guest, paired lower thirds" },
  { id: "phone", label: "Phone go-live", blurb: "a caller on the line — the guest's lower third leads" },
] as const;

export type StudioSceneId = (typeof STUDIO_SCENES)[number]["id"];

export function isStudioScene(v: unknown): v is StudioSceneId {
  return typeof v === "string" && (STUDIO_SCENES as readonly { id: string }[]).some((s) => s.id === v);
}
