"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip, SectionHead, field, overlay, sheet } from "@/components/console/glass";
import { upload as blobDirectUpload } from "@vercel/blob/client";
import type { StoreItem } from "@/lib/store";

// entitlement.ts is server-only (fs/redis) — a "use client" screen must never
// import it directly, so the tier names ride the /api/admin/store response
// instead (added there) and only the shape is duplicated here.
type Tier = "A" | "B" | "C";
type TierNames = Record<Tier, { name: string }>;

/**
 * /a/store — the Items room, redesigned (the blessed mockups, 0018.05.22):
 * one calm shelf table (thumb · item · price · status · fulfilled-by),
 * an item editor in a popup sheet, and fulfillment partners that only
 * appear once their API env is actually configured. The API is the gate
 * (operator session); these screens are the courtesy.
 */

const BLANK: StoreItem = {
  id: "",
  schemaVersion: 2,
  title: "",
  blurb: "",
  images: [],
  media: { images: [] },
  kind: "self",
  price: {},
  fulfillment: "self",
  status: "hidden",
};

interface Partners { printful: boolean; fourthwall: boolean }

interface ShelfData {
  denied: boolean;
  items?: StoreItem[];
  partners?: Partners;
  /** blob store live → deliverables upload browser → blob directly */
  deliverableDirect?: boolean;
  tiers?: TierNames;
}

/** mirror of the server's deliverable-name hygiene — keeps pathnames sane */
function safeDeliverableName(name: string): string {
  const ext = (name.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "").toLowerCase();
  const base = name
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,8}$/i, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "deliverable"}${ext}`;
}

/** Pure fetcher — no state here, so effect and handlers share it cleanly. */
async function fetchShelf(): Promise<ShelfData | null> {
  try {
    const ci = await fetch("/api/admin/store", { cache: "no-store" });
    if (ci.status === 401) return { denied: true };
    const di = await ci.json();
    return {
      denied: false,
      items: di.ok ? di.items : undefined,
      partners: di.ok
        ? { printful: Boolean(di.partners?.printful), fourthwall: Boolean(di.partners?.fourthwall) }
        : undefined,
      deliverableDirect: di.ok ? Boolean(di.uploads?.deliverableDirect) : undefined,
      tiers: di.ok ? di.tiers : undefined,
    };
  } catch {
    return null;
  }
}

const KIND_WORD: Record<StoreItem["kind"], string> = {
  self: "merch",
  fourthwall: "merch",
  digital: "digital",
  package: "package",
  service: "service",
  retreat: "retreat seat",
};

function priceWords(item: StoreItem): string {
  if (item.price.sats != null) return `${item.price.sats.toLocaleString("en-US")} sats`;
  if (item.price.fiat) return `${(item.price.fiat.amount / 100).toFixed(2)} ${item.price.fiat.currency}`;
  return "no price";
}

function FulfilledBy({ item }: { item: StoreItem }) {
  if (item.partner === "printful") return <Chip tone="rose">Printful</Chip>;
  if (item.partner === "fourthwall" || item.kind === "fourthwall") return <Chip tone="grey">Fourthwall</Chip>;
  switch (item.kind) {
    case "digital":
      return <Chip tone="teal">instant download</Chip>;
    case "package":
      return <Chip tone="teal">doors open on pay</Chip>;
    case "service":
      return <Chip tone="lavender">in person / call</Chip>;
    case "retreat":
      return <Chip tone="teal">a seat, held</Chip>;
    default:
      return <Chip tone="lavender">Love, by hand</Chip>;
  }
}

function StatusChip({ status }: { status: StoreItem["status"] }) {
  if (status === "live") return <Chip tone="green">live</Chip>;
  if (status === "soldout") return <Chip tone="rose">sold out</Chip>;
  return <Chip tone="grey">hidden</Chip>;
}

const editorCard: React.CSSProperties = {
  background: "var(--glass)",
  border: "1px solid rgba(139,118,196,.25)",
  borderRadius: 14,
  padding: "14px 16px",
};

const cardHead: React.CSSProperties = {
  fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.02rem", margin: "0 0 10px", color: "var(--ink-strong)",
};

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase",
  color: "var(--muted)", margin: "10px 0 3px",
};

export default function StoreRoom() {
  const [items, setItems] = useState<StoreItem[] | null>(null);
  const [partners, setPartners] = useState<Partners>({ printful: false, fourthwall: false });
  const [denied, setDenied] = useState(false);
  const [draft, setDraft] = useState<StoreItem | null>(null);
  const [sizesText, setSizesText] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [directUp, setDirectUp] = useState(false);
  const [dUploading, setDUploading] = useState(false);
  const [dProgress, setDProgress] = useState<number | null>(null);
  const [dNote, setDNote] = useState<string | null>(null);
  const [dReplace, setDReplace] = useState(false);
  const [tiers, setTiers] = useState<TierNames | null>(null);

  const apply = useCallback((d: ShelfData | null) => {
    if (!d) return;
    if (d.denied) {
      setDenied(true);
      return;
    }
    if (d.items) setItems(d.items);
    if (d.partners !== undefined) setPartners(d.partners);
    if (d.deliverableDirect !== undefined) setDirectUp(d.deliverableDirect);
    if (d.tiers) setTiers(d.tiers);
  }, []);

  const load = useCallback(async () => apply(await fetchShelf()), [apply]);

  useEffect(() => {
    let alive = true;
    async function first() {
      const d = await fetchShelf();
      if (alive) apply(d);
    }
    void first();
    return () => {
      alive = false;
    };
  }, [apply]);

  async function save(item: StoreItem) {
    const res = await fetch("/api/admin/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    setNote(data.ok ? null : data.reason);
    if (data.ok) {
      setDraft(null);
      setSizesText("");
      setDNote(null);
      setDReplace(false);
      load();
    }
  }

  /** The sheet's save — folds the comma-separated sizes text into the draft. */
  async function saveDraft() {
    if (!draft) return;
    const sizes = sizesText.split(",").map((s) => s.trim()).filter(Boolean);
    await save({ ...draft, sizes: sizes.length ? sizes : undefined });
  }

  function openEditor(item: StoreItem) {
    setDraft(item);
    setSizesText(item.sizes?.join(", ") ?? "");
    setNote(null);
    setDNote(null);
    setDReplace(false);
  }

  async function toggle(item: StoreItem, status: StoreItem["status"]) {
    await save({ ...item, status });
  }

  async function removeItem(item: StoreItem) {
    // a shelf mistake should be removable — but never silently
    if (!confirm(`Delete "${item.title}" from the shelf? Orders already placed keep their records.`)) return;
    const res = await fetch(`/api/admin/store?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if ((await res.json().catch(() => ({ ok: false }))).ok) {
      setDraft(null);
      load();
    } else setNote("delete failed — check the shelf and try again");
  }

  /** Product shots → the operator-gated upload route → draft.media.images. */
  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setNote(null);
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      try {
        const res = await fetch("/api/admin/store/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) {
          setDraft((d) => {
            if (!d) return d;
            const media = d.media ?? { images: [] };
            return { ...d, media: { ...media, images: [...media.images, data.url] } };
          });
        } else {
          setNote(data.reason ?? "upload failed");
        }
      } catch {
        setNote("upload unreachable — try again");
      }
    }
    setUploading(false);
  }

  /**
   * The PAID file. Blob live → browser uploads straight to blob (the token
   * route only mints permission — Vercel's ~4.5 MB body cap never applies).
   * Dev driver → multipart to the same route, written under
   * data/deliverables/. Either way the resulting blobPath lands on the
   * draft; SAVE (the admin PUT) attaches it to the ware.
   */
  async function uploadDeliverable(file: File | null) {
    if (!file || !draft?.media?.deliverable) return;
    setDUploading(true);
    setDProgress(null);
    setDNote(null);
    setNote(null);
    try {
      let blobPath: string;
      if (directUp) {
        const result = await blobDirectUpload(`store/deliverables/${safeDeliverableName(file.name)}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/store/upload-deliverable",
          multipart: true,
          onUploadProgress: ({ percentage }) => setDProgress(Math.round(percentage)),
        });
        blobPath = result.pathname;
      } else {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/store/upload-deliverable", { method: "POST", body: fd });
        const data = await res.json();
        if (!data.ok) {
          setNote(data.reason ?? "upload failed");
          return;
        }
        blobPath = data.blobPath;
      }
      setDraft((d) =>
        d?.media?.deliverable
          ? { ...d, media: { ...d.media, deliverable: { ...d.media.deliverable, blobPath } } }
          : d
      );
      setDReplace(false);
      setDNote("uploaded ✓ — press Save to attach it to the item");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "upload failed");
    } finally {
      setDUploading(false);
      setDProgress(null);
    }
  }

  function removeImage(url: string) {
    setDraft((d) => {
      if (!d) return d;
      const media = d.media ?? { images: [] };
      return { ...d, media: { ...media, images: media.images.filter((u) => u !== url) } };
    });
  }

  /** The first picture is the item's face — this makes any picture first. */
  function makeDefault(url: string) {
    setDraft((d) => {
      if (!d) return d;
      const media = d.media ?? { images: [] };
      return { ...d, media: { ...media, images: [url, ...media.images.filter((u) => u !== url)] } };
    });
  }

  if (denied) {
    return (
      <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>
        operator session required —{" "}
        <a href="/a" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
          sign in at the door
        </a>
        .
      </p>
    );
  }
  if (!items) return <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>reading the shelf…</p>;

  const q = search.trim().toLowerCase();
  const shown = q
    ? items.filter((i) =>
        [i.title, i.sku ?? "", i.id, KIND_WORD[i.kind]].some((s) => s.toLowerCase().includes(q)))
    : items;

  const anyPartner = partners.printful || partners.fourthwall;

  return (
    <div className="p-2 text-sm">
      <SectionHead label={`${items.length} ${items.length === 1 ? "item" : "items"} on the shelf`} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "0 0 12px" }}>
        <input
          placeholder="🔍 search the shelf…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...field, borderRadius: 999, padding: "9px 18px", flex: 1, minWidth: 170 }}
        />
        <a className="btn btn-ghost btn-sm" href="/store" target="_blank" rel="noreferrer">
          Preview store
        </a>
        <button className="btn btn-sm" onClick={() => openEditor(BLANK)}>
          + Add item
        </button>
      </div>

      {shown.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          {items.length === 0 ? "nothing on the shelf yet — add the first item ✨" : "nothing matches that search"}
        </p>
      )}
      {shown.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", fontSize: ".86rem" }}>
          <thead>
            <tr>
              {["", "Item", "Price", "Status", "Fulfilled by", ""].map((h, i) => (
                <th key={i} style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase",
                  color: "var(--muted)", textAlign: "left", padding: "0 10px 2px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((item) => {
              const face = item.media?.images[0] ?? item.images[0];
              const td: React.CSSProperties = {
                background: "var(--glass)", padding: "10px 10px", verticalAlign: "middle",
                borderTop: "1px solid rgba(255,255,255,.9)", borderBottom: "1px solid rgba(139,118,196,.18)",
              };
              return (
                <tr key={item.id}>
                  <td style={{ ...td, borderRadius: "14px 0 0 14px", borderLeft: "1px solid rgba(139,118,196,.18)", width: 54 }}>
                    {face ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={face} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
                    ) : (
                      <span style={{ width: 44, height: 44, borderRadius: 10, display: "grid", placeItems: "center",
                        background: "linear-gradient(135deg,var(--lavender-soft),var(--lavender))", color: "#fff", fontSize: "1.1rem" }}>✦</span>
                    )}
                  </td>
                  <td style={td}>
                    <b style={{ display: "block", fontSize: ".92rem", color: "var(--ink-strong)" }}>{item.title}</b>
                    <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>
                      {KIND_WORD[item.kind]}
                      {item.sku && ` · №${item.sku}`}
                      {item.sizes && item.sizes.length > 0 && ` · ${item.sizes.join(" ")}`}
                      {item.media?.deliverable &&
                        ` · +${item.media.deliverable.kind}${item.media.deliverable.blobPath ? " ✓" : " (no file)"}`}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <span style={{ fontFamily: "var(--serif)", color: "var(--gold-deep)" }}>{priceWords(item)}</span>
                    {item.sale?.sats != null && (
                      <span style={{ display: "block", fontSize: ".68rem", color: "var(--err)" }}>
                        sale {item.sale.sats.toLocaleString("en-US")} sats
                      </span>
                    )}
                  </td>
                  <td style={td}><StatusChip status={item.status} /></td>
                  <td style={td}><FulfilledBy item={item} /></td>
                  <td style={{ ...td, borderRadius: "0 14px 14px 0", borderRight: "1px solid rgba(139,118,196,.18)",
                    whiteSpace: "nowrap", textAlign: "right" }}>
                    <button onClick={() => openEditor(item)}
                      style={{ background: "none", border: 0, cursor: "pointer", padding: "6px 4px", fontFamily: "inherit",
                        fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
                        color: "var(--info)" }}>
                      edit
                    </button>
                    <button onClick={() => toggle(item, item.status === "live" ? "hidden" : "live")}
                      style={{ background: "none", border: 0, cursor: "pointer", padding: "6px 4px", marginLeft: 6, fontFamily: "inherit",
                        fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
                        color: item.status === "live" ? "var(--muted)" : "var(--ok)" }}>
                      {item.status === "live" ? "hide" : "go live"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {note && !draft && <p style={{ color: "var(--err)", fontSize: ".82rem" }}>{note}</p>}

      {anyPartner && (
        <>
          <SectionHead label="Fulfillment partners" />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}>
            {partners.printful && (
              <div style={editorCard}>
                <b style={{ fontSize: ".88rem" }}>Printful</b> <Chip tone="green">connected</Chip>
                <p style={{ margin: "6px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>
                  print-on-demand — pick Printful on an item and paid orders push over automatically
                </p>
              </div>
            )}
            {partners.fourthwall && (
              <div style={editorCard}>
                <b style={{ fontSize: ".88rem" }}>Fourthwall</b> <Chip tone="green">connected</Chip>
                <p style={{ margin: "6px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>
                  their product, our checkout — paid orders land in your Fourthwall dashboard
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <p style={{ marginTop: 22, fontSize: ".76rem", color: "var(--muted)" }}>
        money rails, discount codes, and the order book live in{" "}
        <a href="/a/money" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>Money Jars</a>.
      </p>

      {/* ── the item editor sheet ── */}
      {draft && (
        <div style={overlay} onClick={() => setDraft(null)}>
          <div style={{ ...sheet, maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.3rem", margin: 0, flex: 1 }}>
                {draft.id ? draft.title || "Edit item" : "A new item"}
              </h3>
              <button className="btn btn-sm" onClick={saveDraft} disabled={uploading || dUploading}>
                Save
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Close</button>
            </div>
            {note && <p style={{ color: "var(--err)", fontSize: ".82rem", margin: "0 0 10px" }}>{note}</p>}

            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <div style={editorCard}>
                  <h4 style={cardHead}>The story</h4>
                  <label style={{ ...fieldLabel, marginTop: 0 }}>name</label>
                  <input value={draft.title} placeholder="what is it called?"
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    style={{ ...field, width: "100%" }} />
                  <label style={fieldLabel}>the words</label>
                  <textarea value={draft.blurb} placeholder="a line or two in Love's voice"
                    onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
                    style={{ ...field, width: "100%", minHeight: 64, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ flex: 1, minWidth: 120 }}>
                      <label style={fieldLabel}>item № (optional)</label>
                      <input value={draft.sku ?? ""} placeholder="sku"
                        onChange={(e) => setDraft({ ...draft, sku: e.target.value || undefined })}
                        style={{ ...field, width: "100%" }} />
                    </span>
                    <span style={{ flex: 2, minWidth: 160 }}>
                      <label style={fieldLabel}>sizes, comma-separated</label>
                      <input value={sizesText} placeholder="S, M, L, XL"
                        onChange={(e) => setSizesText(e.target.value)}
                        style={{ ...field, width: "100%" }} />
                    </span>
                  </div>
                </div>

                <div style={editorCard}>
                  <h4 style={cardHead}>Pictures</h4>
                  {(draft.media?.images.length ?? 0) > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                      {draft.media?.images.map((url, idx) => (
                        <span key={url} style={{ position: "relative", width: 76 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" style={{ width: 76, height: 76, borderRadius: 10, objectFit: "cover",
                            border: idx === 0 ? "2px solid var(--gold-deep)" : "1px solid rgba(139,118,196,.35)" }} />
                          <button onClick={() => removeImage(url)} aria-label="remove picture"
                            style={{ position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%",
                              border: "1px solid rgba(139,118,196,.5)", background: "#fff", cursor: "pointer",
                              fontSize: ".7rem", lineHeight: 1, color: "var(--ink)" }}>×</button>
                          {idx === 0 ? (
                            <span style={{ display: "block", textAlign: "center", fontSize: ".6rem", fontWeight: 700,
                              color: "var(--gold-deep)", marginTop: 2 }}>★ default</span>
                          ) : (
                            <button onClick={() => makeDefault(url)}
                              style={{ display: "block", width: "100%", background: "none", border: 0, cursor: "pointer",
                                fontSize: ".6rem", color: "var(--muted)", marginTop: 2, fontFamily: "inherit" }}>
                              ☆ make default
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  <label className="btn btn-sm" style={{ cursor: uploading ? "wait" : "pointer" }}>
                    {uploading ? "Uploading…" : "+ Add pictures"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      multiple
                      disabled={uploading}
                      onChange={(e) => {
                        void upload(e.target.files);
                        e.target.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  <p style={{ margin: "8px 0 0", fontSize: ".72rem", color: "var(--muted)" }}>
                    png/jpg/webp/gif/avif up to 4 MB each — the ★ default picture is the item&apos;s face on the shelf
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <div style={editorCard}>
                  <h4 style={cardHead}>The money</h4>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ ...fieldLabel, marginTop: 0 }}>price in sats</label>
                      <input type="number" value={draft.price.sats ?? ""} placeholder="111111"
                        onChange={(e) =>
                          setDraft({ ...draft, price: { ...draft.price, sats: e.target.value ? Number(e.target.value) : undefined } })}
                        style={{ ...field, width: "100%" }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ ...fieldLabel, marginTop: 0 }}>sale sats (optional)</label>
                      <input type="number" value={draft.sale?.sats ?? ""} placeholder="—"
                        onChange={(e) =>
                          setDraft({ ...draft, sale: e.target.value ? { sats: Number(e.target.value) } : undefined })}
                        style={{ ...field, width: "100%" }} />
                    </span>
                  </div>
                  <label style={fieldLabel}>status</label>
                  <select value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as StoreItem["status"] })}
                    style={{ ...field, width: "100%" }}>
                    <option value="live">● live on the shelf</option>
                    <option value="hidden">○ hidden</option>
                    <option value="soldout">◌ sold out</option>
                  </select>
                </div>

                <div style={editorCard}>
                  <h4 style={cardHead}>Who fulfills it</h4>
                  <select
                    value={draft.kind}
                    onChange={(e) =>
                      setDraft({ ...draft, kind: e.target.value as StoreItem["kind"], fulfillment: e.target.value as StoreItem["kind"] })}
                    style={{ ...field, width: "100%" }}
                  >
                    <option value="self">merch — Love packs &amp; ships it</option>
                    <option value="digital">digital — instant download</option>
                    <option value="package">package — membership tier</option>
                    <option value="service">service — a booked session</option>
                  </select>
                  {anyPartner && (
                    <>
                      <label style={fieldLabel}>drop-ship partner</label>
                      <select
                        value={draft.partner ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, partner: (e.target.value || undefined) as StoreItem["partner"] })}
                        style={{ ...field, width: "100%" }}
                      >
                        <option value="">no partner — as above</option>
                        {partners.printful && <option value="printful">Printful — printed &amp; shipped on demand</option>}
                        {partners.fourthwall && <option value="fourthwall">Fourthwall — their product, our checkout</option>}
                      </select>
                      <p style={{ margin: "8px 0 0", fontSize: ".72rem", color: "var(--muted)" }}>
                        paid in sats here → the order flies to the partner → tracking lands on the receipt
                      </p>
                    </>
                  )}
                </div>

                {draft.kind === "package" && (
                  <div style={editorCard}>
                    <h4 style={cardHead}>Which door it opens</h4>
                    <label style={{ ...fieldLabel, marginTop: 0 }}>tier granted</label>
                    <select
                      value={draft.entitlementTier ?? ""}
                      onChange={(e) => setDraft({ ...draft, entitlementTier: e.target.value || undefined })}
                      style={{ ...field, width: "100%" }}
                    >
                      <option value="">— no tier (this item won&apos;t unlock anything) —</option>
                      {(["A", "B", "C"] as Tier[]).map((t) => (
                        <option key={t} value={t}>{tiers?.[t]?.name ?? t}</option>
                      ))}
                    </select>
                    <label style={fieldLabel}>taster window, in days (optional)</label>
                    <input
                      type="number"
                      value={draft.entitlementDays ?? ""}
                      placeholder="leave blank for the ordinary open-ended membership"
                      onChange={(e) =>
                        setDraft({ ...draft, entitlementDays: e.target.value ? Number(e.target.value) : undefined })}
                      style={{ ...field, width: "100%" }}
                    />
                    <p style={{ margin: "8px 0 0", fontSize: ".72rem", color: "var(--muted)" }}>
                      set this for a one-week taster (weekly-one-week, observer-one-week, …) — the grant
                      closes itself this many days after purchase instead of standing open
                    </p>
                  </div>
                )}

                <div style={editorCard}>
                  <h4 style={cardHead}>Digital deliverable</h4>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <select
                      value={draft.media?.deliverable?.kind ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          media: {
                            ...(draft.media ?? { images: [] }),
                            deliverable: e.target.value
                              ? {
                                  kind: e.target.value as "audio" | "video" | "file",
                                  label: draft.media?.deliverable?.label ?? "",
                                  // kind changes keep the attached file; "none" detaches
                                  blobPath: draft.media?.deliverable?.blobPath,
                                }
                              : undefined,
                          },
                        })
                      }
                      style={{ ...field, minWidth: 110 }}
                    >
                      <option value="">none</option>
                      <option value="audio">audio</option>
                      <option value="video">video</option>
                      <option value="file">file</option>
                    </select>
                    {draft.media?.deliverable && (
                      <input
                        placeholder='label ("full album download")'
                        value={draft.media.deliverable.label}
                        onChange={(e) =>
                          setDraft((d) =>
                            d?.media?.deliverable
                              ? {
                                  ...d,
                                  media: { ...d.media, deliverable: { ...d.media.deliverable, label: e.target.value } },
                                }
                              : d
                          )
                        }
                        style={{ ...field, flex: 1, minWidth: 150 }}
                      />
                    )}
                  </div>
                  {draft.media?.deliverable && (
                    <div style={{ marginTop: 10 }}>
                      {draft.media.deliverable.blobPath ? (
                        <p style={{ margin: 0, fontSize: ".78rem", color: "var(--ok)" }}>
                          file attached ✓{" "}
                          <span style={{ color: "var(--muted)" }}>
                            {draft.media.deliverable.blobPath.split("/").pop()}
                          </span>
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: ".78rem", color: "var(--muted)" }}>
                          no file yet — buyers get no download button until one is attached
                        </p>
                      )}
                      {draft.media.deliverable.blobPath && !dReplace ? (
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                          onClick={() => setDReplace(true)} disabled={dUploading}>
                          Replace file
                        </button>
                      ) : (
                        <label className="btn btn-ghost btn-sm" style={{ marginTop: 8, cursor: dUploading ? "wait" : "pointer" }}>
                          {dUploading ? "Uploading…" : "Choose the paid file"}
                          <input
                            type="file"
                            accept="audio/*,video/*,application/zip,application/x-zip-compressed,application/pdf,.zip,.pdf"
                            disabled={dUploading}
                            onChange={(e) => {
                              void uploadDeliverable(e.target.files?.[0] ?? null);
                              e.target.value = "";
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      )}
                      {dUploading && (
                        <p style={{ margin: "6px 0 0", fontSize: ".75rem", color: "var(--muted)" }}>
                          {dProgress != null ? `uploading… ${dProgress}%` : "uploading…"}
                        </p>
                      )}
                      {dNote && <p style={{ margin: "6px 0 0", fontSize: ".75rem", color: "var(--ok)" }}>{dNote}</p>}
                      <p style={{ margin: "8px 0 0", fontSize: ".72rem", color: "var(--muted)" }}>
                        {directUp
                          ? "audio/video/zip/pdf up to 1 GB — uploads go from your browser straight to the file vault; the buyer's receipt grows a download button once payment settles"
                          : "dev driver: the file lands in data/deliverables/ on this machine; the buyer's receipt grows a download button once payment settles"}
                      </p>
                    </div>
                  )}
                  <label style={fieldLabel}>public teaser URL (optional — never the paid file)</label>
                  <input
                    value={draft.media?.preview ?? ""}
                    placeholder="https://…"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        media: { ...(draft.media ?? { images: [] }), preview: e.target.value || undefined },
                      })
                    }
                    style={{ ...field, width: "100%" }}
                  />
                </div>

                {draft.id && (
                  <div style={{ textAlign: "right" }}>
                    <button onClick={() => removeItem(draft)}
                      style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "inherit",
                        fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
                        color: "var(--err)", padding: 6 }}>
                      Delete this item
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
