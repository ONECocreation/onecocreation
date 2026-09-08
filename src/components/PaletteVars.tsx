import { emitTokenVars } from "@pacsarcade/puck-config/tokens";
import { getPalette, getPaletteDawn, getFaces, FACE_KEYS, FACE_CHOICES, FACE_CSS_VAR } from "@/lib/brand-palette";
import { ONECOCREATION } from "@/brand/tokens";

/**
 * PaletteVars — server component exposing the brand palette as --p1..--p5,
 * now LAYERED (step 5, varianted tokens): night base on :root, dawn
 * overrides on html[data-oc-theme="light"] and the preview overlay's
 * .oc-pv-light pane; .oc-pv-dark re-pins night inside a light document.
 * href+precedence make React 19 HOIST this <style> into <head>, where the
 * editor canvas style-sync AND the companion-artboard mirror can see it
 * (the old body-rendered style was invisible to both).
 * Scope classes must match src/app/studio/preview.css (.oc-pv-light/-dark).
 */
export default async function PaletteVars() {
  const [p, dawn, faces] = await Promise.all([getPalette(), getPaletteDawn(), getFaces()]);
  const varianted: Record<string, Record<string, string>> = {};
  for (const [k, v] of Object.entries(dawn)) if (v) varianted[k] = { dawn: v };
  const css = emitTokenVars(ONECOCREATION, {
    overrides: { base: p, varianted },
    dawnScopes: [".oc-pv-light"],
    nightScopes: [".oc-pv-dark"],
  });
  /* TASK-182 (DECLARED forced edit — this file is outside the lane's OWNS):
     the brand desk's saved FACES pour here, beside the palette they share a
     rail with — one <style>, one truth. Poured on body (a direct assignment
     beats the :root declarations' inheritance regardless of <head> order)
     and scoped to the default cartridge — a selected twin pours its own
     faces (cartridges.css) and the desk's choice must never fight it. */
  const faceCss = `html:not([data-oc-cartridge]) body{${FACE_KEYS.map((k) => `${FACE_CSS_VAR[k]}:${FACE_CHOICES[faces[k]].stack}`).join(";")}}`;
  return <style data-oc-token-vars="" dangerouslySetInnerHTML={{ __html: css + faceCss }} />;
}
