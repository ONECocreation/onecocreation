import { promises as fs } from "fs";
import path from "path";
import type { FilesystemDriverConfig, PageStoreDriver } from "./types";

/**
 * Filesystem driver — one file per key under `dir` (default
 * `data/puck-store/` under the process working directory, created lazily on
 * first write). This is the local-dev answer to "studio with no KV": before
 * this driver existed a new site could edit but never save. String values
 * land as raw file contents; sets land as JSON arrays. Key names are
 * encodeURIComponent'd into filenames, so colons (`puck:page:home`) and the
 * `popup:` lane are safe on any filesystem.
 *
 * No locking, no atomicity theatre: this driver exists so a single operator
 * on a laptop loses no work. Production durability is the kv driver's job
 * (and, eventually, the git driver's).
 */
export function filesystemDriver(config?: FilesystemDriverConfig): PageStoreDriver {
  const dir = config?.dir ?? path.join(process.cwd(), "data", "puck-store");
  const fileFor = (key: string) => path.join(dir, `${encodeURIComponent(key)}.json`);

  async function readRaw(key: string): Promise<string | null> {
    try {
      return await fs.readFile(fileFor(key), "utf8");
    } catch {
      return null;
    }
  }

  async function writeRaw(key: string, value: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fileFor(key), value, "utf8");
  }

  async function readSet(key: string): Promise<string[]> {
    const raw = await readRaw(key);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw) as unknown;
      return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
    } catch {
      return [];
    }
  }

  return {
    /* the filesystem is always "configured" — the dir materialises on the
       first write */
    ready: () => true,
    get: readRaw,
    set: writeRaw,
    async del(...keys) {
      for (const key of keys) {
        await fs.unlink(fileFor(key)).catch(() => {});
      }
    },
    async sadd(key, member) {
      const members = await readSet(key);
      if (!members.includes(member)) {
        members.push(member);
        await writeRaw(key, JSON.stringify(members));
      }
    },
    async srem(key, member) {
      const members = await readSet(key);
      if (members.includes(member)) {
        await writeRaw(key, JSON.stringify(members.filter((m) => m !== member)));
      }
    },
    smembers: readSet,
  };
}
