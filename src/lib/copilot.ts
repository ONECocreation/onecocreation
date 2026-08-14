import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import type { PuckPageData } from "./puck-store";

/**
 * Love's Copilot — the brain (Admiral-approved 2026-08-10: "love wants that
 * ability to talk to you and make changes on her site. let's use your rails.
 * sonet is fine for her needs"). Love types a plain request; this turns it
 * into a One Cocreation page built ONLY from the house's real Puck
 * components, and returns the Puck Data blob our own KV already stores
 * (puck:page:<slug>). No Puck cloud, no PUCK_API_KEY — our rails: Claude
 * Sonnet 5 + output_config.format guaranteeing valid Puck JSON, written to
 * the same store the studio editor reads.
 *
 * ONE spec (COMPONENTS) is the single source for both the prompt reference
 * Love's request is graded against AND the JSON schema the model must fill.
 * When PUCK P3 registers the full Kit (real buttons/cards/header) as more
 * blocks in puck-config.tsx, mirror each here and the copilot can place it.
 */

type FieldDef = { schema: Record<string, unknown>; desc: string };
type CompDef = { type: string; desc: string; fields: Record<string, FieldDef> };

/* Keep in lockstep with src/lib/puck-config.tsx — the model may only place
   components that actually render in the editor and on the live site (PUCK
   P3: the real house palette). */
const COMPONENTS: CompDef[] = [
  {
    type: "Eyebrow",
    desc: "A small uppercase label above a heading (the rose 'kicker'). Use to introduce a section.",
    fields: { text: { schema: { type: "string" }, desc: "a short label, e.g. 'Sessions' or 'About Love'" } },
  },
  {
    type: "Heading",
    desc: "A section heading in the house display face.",
    fields: {
      text: { schema: { type: "string" }, desc: "the heading text" },
      level: {
        schema: { type: "string", enum: ["h1", "h2", "h3"] },
        desc: "h1 for the page title (use exactly once, at the very top); h2 for section headings; h3 for sub-sections",
      },
    },
  },
  {
    type: "StackedHeading",
    desc: "A large two-line display heading where the second line is teal — the house's signature section title (e.g. 'MY' / 'STORY'). Use for a bold section opener.",
    fields: {
      line1: { schema: { type: "string" }, desc: "the first line (usually short, uppercase)" },
      line2: { schema: { type: "string" }, desc: "the second line, shown in teal" },
      tag: { schema: { type: "string", enum: ["h1", "h2"] }, desc: "h1 only for the page's main title; h2 otherwise" },
    },
  },
  {
    type: "Text",
    desc: "A paragraph of plain body copy.",
    fields: {
      text: { schema: { type: "string" }, desc: "the paragraph text; one to a few warm, clear sentences" },
    },
  },
  {
    type: "RichText",
    desc: "A paragraph that needs inline emphasis or colour. Use ONLY when a word or phrase should stand out; otherwise use Text.",
    fields: {
      html: {
        schema: { type: "string" },
        desc: "the paragraph as light HTML — allowed tags: <b>, <i>, <br>, and <span style=\"color:var(--teal-bright)\"> or var(--gold-2). No other tags, no scripts.",
      },
    },
  },
  {
    type: "PullQuote",
    desc: "A large centred pull-quote set off from the body — for a line worth pausing on, in the site's voice.",
    fields: { text: { schema: { type: "string" }, desc: "the quote line" } },
  },
  {
    type: "Button",
    desc: "A call-to-action button.",
    fields: {
      label: { schema: { type: "string" }, desc: "the button label, e.g. 'Book a reading'" },
      href: { schema: { type: "string" }, desc: 'where it links — a site path such as "/book", "/store", or "#"' },
      variant: {
        schema: { type: "string", enum: ["gold", "rose", "teal", "quiet"] },
        desc: "gold for the main action (use once per section), rose or teal for a warm secondary, quiet for a plain text link",
      },
    },
  },
  {
    type: "Card",
    desc: "A glass card with a title and a short body — good for listing an offering, idea, or step.",
    fields: {
      title: { schema: { type: "string" }, desc: "the card title" },
      body: { schema: { type: "string" }, desc: "one or two sentences" },
    },
  },
  {
    type: "Hero",
    desc: "A large celestial hero band for the top of a page: a small tagline, a big title, and a subtitle. Use at most once, at the very top.",
    fields: {
      days: { schema: { type: "string" }, desc: "the small tagline above the title, e.g. 'Where Heaven and Earth Meet'" },
      title: { schema: { type: "string" }, desc: "the big display title" },
      sub: { schema: { type: "string" }, desc: "the subtitle line under the title" },
    },
  },
  {
    type: "Note",
    desc: "A gentle highlighted note box on soft glass — for a reassurance, a small aside, or a callout.",
    fields: { text: { schema: { type: "string" }, desc: "the note text" } },
  },
  {
    type: "Quote",
    desc: "A testimonial: a client's words and who said them.",
    fields: {
      quote: { schema: { type: "string" }, desc: "the quote, in the client's voice" },
      who: { schema: { type: "string" }, desc: "attribution, e.g. '— Sarah'" },
    },
  },
];

/** The component reference Love's request is built against, as prompt text. */
function componentReference(): string {
  return COMPONENTS.map((c) => {
    const fields = Object.entries(c.fields)
      .map(([name, f]) => `    • ${name}: ${f.desc}`)
      .join("\n");
    return `${c.type} — ${c.desc}\n${fields}`;
  }).join("\n\n");
}

/** JSON schema for one content item — a discriminated union over the
 *  registered components (anyOf of {type: const, props}). */
function contentItemSchema(): Record<string, unknown> {
  return {
    anyOf: COMPONENTS.map((c) => {
      const props: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [name, f] of Object.entries(c.fields)) {
        props[name] = f.schema;
        required.push(name);
      }
      return {
        type: "object",
        properties: {
          type: { type: "string", const: c.type },
          props: { type: "object", properties: props, required, additionalProperties: false },
        },
        required: ["type", "props"],
        additionalProperties: false,
      };
    }),
  };
}

function pageSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      content: { type: "array", items: contentItemSchema() },
    },
    required: ["content"],
    additionalProperties: false,
  };
}

/** Anthropic key looks real (guards the recurring truncated-paste foot-gun). */
function anthropicKeyOk(): boolean {
  const k = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  return k.startsWith("sk-ant-") && k.length > 90;
}

/** The copilot is configured if EITHER a local agent (Ollama) is set OR a
 *  valid-looking Anthropic key is present. OLLAMA_URL wins when both are set,
 *  so a local run stays sovereign (no Anthropic credits spent). */
export function copilotConfigured(): boolean {
  if (process.env.OLLAMA_URL?.trim()) return true;
  return anthropicKeyOk();
}

export class CopilotUnconfigured extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set");
    this.name = "CopilotUnconfigured";
  }
}
export class CopilotRefused extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "CopilotRefused";
  }
}

type GenItem = { type: string; props: Record<string, unknown> };

function buildSystem(current: PuckPageData | null): string {
  const currentContent = current?.content && Array.isArray(current.content) ? current.content : [];
  return (
    `You are Number One, the design copilot for One Cocreation — Love's ` +
    `bitcoin-native site of intuitive readings and cocreation. You turn ` +
    `Love's plain-language request into a page built ONLY from the house's ` +
    `real components, listed below. Voice: warm, grounded, spiritual but ` +
    `clear — never salesy, never generic filler.\n\n` +
    `Rules:\n` +
    `- Use only the components and fields in the reference; never invent ` +
    `components, fields, or values outside a field's stated options.\n` +
    `- Prefer one H1 at the top, short helpful body copy, and a gold button ` +
    `when there is a clear next step.\n` +
    `- You are given the current page. Apply Love's request as an edit — keep ` +
    `parts she didn't ask to change; only rebuild from scratch if she asks for ` +
    `a new page or the current page is empty.\n` +
    `- Write real copy in Love's voice, not lorem or placeholders.\n` +
    `- Output ONLY the JSON object {"content": [ ...blocks... ]} — nothing else.\n\n` +
    `Available components:\n\n${componentReference()}\n\n` +
    `Current page content (JSON):\n${JSON.stringify(currentContent)}`
  );
}

/** Anthropic (Claude Sonnet 5) backend — structured output guarantees the schema. */
async function genAnthropic(system: string, message: string): Promise<GenItem[]> {
  if (!anthropicKeyOk()) throw new CopilotUnconfigured();
  const client = new Anthropic();
  const params = {
    model: "claude-sonnet-5",
    max_tokens: 4000,
    system,
    output_config: { effort: "low", format: { type: "json_schema", schema: pageSchema() } },
    messages: [{ role: "user", content: message }],
  };
  let res;
  try {
    res = await client.messages.create(params as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403) throw new CopilotUnconfigured();
    throw err;
  }
  if (res.stop_reason === "refusal") {
    throw new CopilotRefused("The request was declined. Try rephrasing what you'd like on the page.");
  }
  const textBlock = res.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";
  try {
    const parsed = JSON.parse(raw) as { content?: GenItem[] };
    return Array.isArray(parsed.content) ? parsed.content : [];
  } catch {
    throw new CopilotRefused("Couldn't read the generated page. Try again in a moment.");
  }
}

/** Local-agent backend — a self-hosted Ollama model, sovereign and free.
 *  Set OLLAMA_URL (e.g. http://localhost:11434 in a local `npm run dev`, or a
 *  reachable VPS endpoint) and OLLAMA_MODEL. Ollama's `format` takes the same
 *  JSON schema for structured output; smaller models are less reliable at it,
 *  so a bad parse surfaces a clear, friendly message. */
async function genOllama(system: string, message: string): Promise<GenItem[]> {
  const url = process.env.OLLAMA_URL!.trim().replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL?.trim() || "llama3.1";
  let res: Response;
  try {
    res = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: pageSchema(),
        options: { temperature: 0.4 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: message },
        ],
      }),
    });
  } catch {
    throw new CopilotRefused("Couldn't reach the local agent — is Ollama running and OLLAMA_URL reachable?");
  }
  if (!res.ok) {
    throw new CopilotRefused(`Local agent error ${res.status} — check the model name (OLLAMA_MODEL=${model}).`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  const raw = data.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as { content?: GenItem[] };
    return Array.isArray(parsed.content) ? parsed.content : [];
  } catch {
    throw new CopilotRefused("The local agent didn't return valid page data — try a simpler request or a stronger model.");
  }
}

/**
 * Turn Love's request into a Puck page. `current` is the page she's editing
 * (so "make the heading warmer" edits in place rather than starting over);
 * pass null for a blank page. Routes to the local agent when OLLAMA_URL is
 * set, else Anthropic. Returns the exact PuckPageData the studio editor and
 * the live <Render> both consume.
 */
export async function generatePage(
  message: string,
  current: PuckPageData | null,
): Promise<PuckPageData> {
  if (!copilotConfigured()) throw new CopilotUnconfigured();
  const system = buildSystem(current);
  const items = process.env.OLLAMA_URL?.trim()
    ? await genOllama(system, message)
    : await genAnthropic(system, message);

  /* Puck requires a stable unique props.id on every block — the model
     never invents these; we stamp them after generation. */
  const content = items.map((item) => ({
    type: item.type,
    props: { ...item.props, id: `${item.type}-${crypto.randomUUID().slice(0, 8)}` },
  }));

  return { content, root: current?.root ?? {} };
}
