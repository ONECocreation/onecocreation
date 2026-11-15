/**
 * lane/oc-sats-when-bitcoin-on (block 976,021 — the Admiral's pin: "only
 * show sats when bitcoin is on"). The designer branch's half of the rule.
 *
 * The house seeds (puck-seeds.ts) carry the old price words as plain Text
 * blocks — "$33/mo — ⚡ ≈ 55,555 sats / month", "$11.11 — ⚡ ≈ 11,110 sats",
 * and the jewelry cards' own "⚡ ≈ 88,000 sats" line. A page Love publishes
 * from those seeds keeps them in her stored doc. While the bitcoin rail is
 * dark this render-time filter takes the sats part out — the line that is
 * ONLY sats goes, the line that leads with dollars keeps its dollars. No
 * new words: it only deletes. Never written back to the store (the
 * applyHomeSwitchesToPuck precedent). Bitcoin live, or nothing matched ⇒
 * the same `data` reference comes back.
 */

type Node = { type?: unknown; props?: Record<string, unknown> };

/** the whole line is a sats price: "⚡ ≈ 88,000 sats" (± " / month") */
const SATS_ONLY = /^\s*⚡\s*≈\s*[\d,]+\s*sats(\s*\/\s*month)?\s*$/;
/** a dollar line with a sats tail: "$33/mo — ⚡ ≈ 55,555 sats / month" */
const SATS_TAIL = /\s*[—·-]\s*⚡\s*≈\s*[\d,]+\s*sats(\s*\/\s*month)?\s*$/;

function isNode(v: unknown): v is Node {
  return typeof v === "object" && v !== null && "type" in v && "props" in v;
}

function walkList(list: unknown[]): { list: unknown[]; changed: boolean } {
  let changed = false;
  const out: unknown[] = [];
  for (const item of list) {
    if (!isNode(item)) { out.push(item); continue; }
    const props = item.props ?? {};
    if (item.type === "Text" && typeof props.text === "string") {
      if (SATS_ONLY.test(props.text)) { changed = true; continue; }
      if (SATS_TAIL.test(props.text)) {
        changed = true;
        out.push({ ...item, props: { ...props, text: props.text.replace(SATS_TAIL, "") } });
        continue;
      }
    }
    const next = walkProps(props);
    if (next.changed) { changed = true; out.push({ ...item, props: next.props }); }
    else out.push(item);
  }
  return { list: changed ? out : list, changed };
}

function walkProps(props: Record<string, unknown>): { props: Record<string, unknown>; changed: boolean } {
  let changed = false;
  let next = props;
  for (const [k, v] of Object.entries(props)) {
    if (!Array.isArray(v)) continue;
    const r = walkList(v);
    if (r.changed) {
      if (!changed) next = { ...props };
      next[k] = r.list;
      changed = true;
    }
  }
  return { props: next, changed };
}

export function applySatsRuleToPuck<T extends { content?: unknown[] }>(data: T, btc: boolean): T {
  if (btc || !Array.isArray(data.content)) return data;
  const r = walkList(data.content);
  return r.changed ? ({ ...data, content: r.list } as T) : data;
}
