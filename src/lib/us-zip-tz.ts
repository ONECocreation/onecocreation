/**
 * USA zip → IANA timezone, close enough for a calendar (Admiral's ask,
 * 0018.05.14): the first 3 digits name the state (USPS allocation), the
 * state names its DOMINANT zone. Split states go with where most people
 * live — a Pensacola soul can flip the select by hand; the artist's zone
 * is always shown beside the chosen time anyway, so nobody misses a call.
 */

const ET = "America/New_York";
const CT = "America/Chicago";
const MT = "America/Denver";
const AZ = "America/Phoenix"; // no DST — its own honest entry
const PT = "America/Los_Angeles";
const AK = "America/Anchorage";
const HI = "Pacific/Honolulu";

export const USA_ZONES: { label: string; tz: string }[] = [
  { label: "Eastern (New York)", tz: ET },
  { label: "Central (Chicago)", tz: CT },
  { label: "Mountain (Denver)", tz: MT },
  { label: "Arizona (no DST)", tz: AZ },
  { label: "Pacific (Los Angeles)", tz: PT },
  { label: "Alaska", tz: AK },
  { label: "Hawaii", tz: HI },
];

/** [firstPrefix, lastPrefix, tz] over the 3-digit zip prefix. */
const RANGES: [number, number, string][] = [
  [5, 139, ET],    // New England, NY, NJ, PR/VI
  [140, 199, ET],  // PA, DE, DC, MD, VA, WV
  [200, 299, ET],  // DC, VA, WV, NC, SC, GA
  [300, 319, ET],  // GA
  [320, 349, ET],  // FL (panhandle west of Apalachicola is CT — dominant ET)
  [350, 369, CT],  // AL
  [370, 385, CT],  // TN (east TN is ET; Nashville CT dominant)
  [386, 397, CT],  // MS
  [398, 399, ET],  // GA (Atlanta overflow)
  [400, 427, ET],  // KY (west KY CT; Louisville/Lexington ET dominant)
  [430, 459, ET],  // OH
  [460, 479, ET],  // IN (northwest + southwest corners CT)
  [480, 499, ET],  // MI (four western UP counties CT)
  [500, 528, CT],  // IA
  [530, 549, CT],  // WI
  [550, 567, CT],  // MN
  [570, 577, CT],  // SD (western SD MT; Sioux Falls CT dominant)
  [580, 588, CT],  // ND (southwest corner MT)
  [590, 599, MT],  // MT
  [600, 629, CT],  // IL
  [630, 658, CT],  // MO
  [660, 679, CT],  // KS (far-west counties MT)
  [680, 693, CT],  // NE (panhandle MT)
  [700, 714, CT],  // LA
  [716, 729, CT],  // AR
  [730, 749, CT],  // OK
  [750, 799, CT],  // TX (El Paso 798-799 is MT — dominant CT)
  [800, 816, MT],  // CO
  [820, 831, MT],  // WY
  [832, 838, MT],  // ID (north ID panhandle PT; Boise MT dominant)
  [840, 847, MT],  // UT
  [850, 865, AZ],  // AZ
  [870, 884, MT],  // NM
  [889, 898, PT],  // NV
  [900, 961, PT],  // CA
  [967, 968, HI],  // HI
  [970, 979, PT],  // OR (Malheur County MT — dominant PT)
  [980, 994, PT],  // WA
  [995, 999, AK],  // AK
];

/** Null when the zip doesn't read as USA — caller keeps the detected zone. */
export function zipToTz(zip: string): string | null {
  const m = zip.trim().match(/^(\d{3})\d{2}/) ?? zip.trim().match(/^(\d{3})$/);
  if (!m) return null;
  const p = Number(m[1]);
  for (const [from, to, tz] of RANGES) {
    if (p >= from && p <= to) return tz;
  }
  return null;
}
