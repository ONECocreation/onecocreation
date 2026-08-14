/**
 * MEMBER LINKS (the Admiral's merge, 0018.05.12): one soul, two doors —
 * an email login and a key login — tied together so purchases, bookings
 * and the member home see ONE person. Links live in the vault as pairs;
 * a subject's GROUP is the transitive closure. Linking never destroys
 * either identity — it widens what each can see.
 */
const KEY = "member:links";

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`member links: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

async function readPairs(): Promise<[string, string][]> {
  try {
    const raw = (await kv(["GET", KEY])) as string | null;
    return raw ? (JSON.parse(raw) as [string, string][]) : [];
  } catch {
    return [];
  }
}

export async function linkMembers(a: string, b: string): Promise<void> {
  const pairs = await readPairs();
  if (!pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
    pairs.push([a, b]);
    await kv(["SET", KEY, JSON.stringify(pairs)]);
  }
}

export async function unlinkMember(subject: string): Promise<void> {
  const pairs = (await readPairs()).filter(([x, y]) => x !== subject && y !== subject);
  await kv(["SET", KEY, JSON.stringify(pairs)]);
}

/** Every subject linked (transitively) to this one, self included. */
export async function memberGroup(subject: string): Promise<string[]> {
  const pairs = await readPairs();
  const group = new Set([subject]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [a, b] of pairs) {
      if (group.has(a) && !group.has(b)) { group.add(b); grew = true; }
      if (group.has(b) && !group.has(a)) { group.add(a); grew = true; }
    }
  }
  return [...group];
}

export async function allPairs(): Promise<[string, string][]> {
  return readPairs();
}
