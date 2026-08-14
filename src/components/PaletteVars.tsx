import { emitTokenVars } from "@pacsarcade/puck-config/tokens";
import { getPalette, getPaletteDawn } from "@/lib/brand-palette";
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
  const [p, dawn] = await Promise.all([getPalette(), getPaletteDawn()]);
  const varianted: Record<string, Record<string, string>> = {};
  for (const [k, v] of Object.entries(dawn)) if (v) varianted[k] = { dawn: v };
  const css = emitTokenVars(ONECOCREATION, {
    overrides: { base: p, varianted },
    dawnScopes: [".oc-pv-light"],
    nightScopes: [".oc-pv-dark"],
  });
  return <style data-oc-token-vars="" dangerouslySetInnerHTML={{ __html: css }} />;
}
