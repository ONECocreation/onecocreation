"use client";

import { useRef, useState, type CSSProperties, type ElementType, type FocusEvent, type ReactNode } from "react";
import { usePenMode } from "./PenMode";
import { COPY_MAX_LENGTH } from "@/lib/copy";

interface EditableProps {
  /** stable, page-namespaced id — the KV key is copy:override:<id> */
  id: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  maxLength?: number;
  /** the code default — may carry inline formatting (<b>/<i>); the P1
   *  plain-text override replaces it wholesale once Love saves an edit */
  children: ReactNode;
  /** server-loaded override text for this id, or null/undefined if none */
  override?: string | null;
}

/**
 * Love's Pen — an inline-editable text block (P1, 2026-08-10). Non-operators
 * and anyone with the pen off get the plain tag back, verbatim — same
 * markup the page always rendered, zero edit affordance in the DOM. Only
 * when isOperator && penOn does it become contentEditable.
 *
 * SSR-safe by construction: the override comes in as a prop from the page's
 * own server-side getAllCopyOverrides() call, so the very first paint (for
 * every visitor) already reflects a saved edit — no client fetch, no flash.
 */
export default function Editable({ id, as, className, style, maxLength, children, override }: EditableProps) {
  const Tag = (as ?? "p") as ElementType;
  const { isOperator, penOn } = usePenMode();
  const [overrideText, setOverrideText] = useState<string | null>(override ?? null);
  const [saved, setSaved] = useState(false);
  const [nearLimit, setNearLimit] = useState<number | null>(null);
  const focusedText = useRef<string | null>(null);
  const cap = maxLength ?? COPY_MAX_LENGTH;

  // common case (everyone, or operator with the pen off): the bare tag,
  // default children or the server-supplied override — no edit chrome at all
  if (!isOperator || !penOn) {
    return (
      <Tag className={className} style={style}>
        {overrideText != null ? overrideText : children}
      </Tag>
    );
  }

  async function saveOverride(text: string) {
    const res = await fetch("/api/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, text }),
    }).catch(() => null);
    if (res?.ok) {
      setOverrideText(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  async function revert() {
    const res = await fetch("/api/copy", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null);
    if (res?.ok) setOverrideText(null);
  }

  function handleFocus(e: FocusEvent<HTMLElement>) {
    focusedText.current = e.currentTarget.textContent ?? "";
  }

  function handleInput(e: React.FormEvent<HTMLElement>) {
    const len = (e.currentTarget.textContent ?? "").length;
    setNearLimit(len > cap - 100 ? len : null);
  }

  async function handleBlur(e: FocusEvent<HTMLElement>) {
    setNearLimit(null);
    const text = (e.currentTarget.textContent ?? "").trim();
    if (!text || text === focusedText.current?.trim()) return; // empty or unchanged — skip the write
    const clamped = text.length > cap ? text.slice(0, cap) : text;
    await saveOverride(clamped);
  }

  return (
    <span className="pen-shell" style={{ position: "relative", display: "block" }}>
      <Tag
        className={`${className ?? ""} pen-editable`.trim()}
        style={style}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onInput={handleInput}
        onBlur={handleBlur}
      >
        {overrideText != null ? overrideText : children}
      </Tag>
      {overrideText != null && (
        <button
          type="button"
          className="pen-revert"
          title="revert to default wording"
          aria-label="revert to default wording"
          onClick={revert}
        >
          ↺
        </button>
      )}
      {saved && <span className="pen-saved">saved ✓</span>}
      {nearLimit != null && (
        <span className="pen-counter">
          {nearLimit}/{cap}
        </span>
      )}
    </span>
  );
}
