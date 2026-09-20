import type { InputHTMLAttributes } from "react";

/**
 * kit Field (TASK-349) — no existing `.field` law to extract wholesale
 * (Ground, TASK-349 brief: `.chip-select` and the two `.console-field`
 * pseudo-rules are the nearest law, neither a full field component); built
 * fresh, grounded in --field-bg/--field-ink (cartridge.css:36).
 *
 * A bound `<label htmlFor>` + `<input>` + an error-text slot rendered only
 * when `error` is passed, wired with `aria-describedby` so a screen reader
 * hears it. The error never rides color alone — the text itself is the
 * signal; the border tint is a redundant cue, not the only one.
 */
export interface KitFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

export default function Field({ id, label, error, className, ...rest }: KitFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={["kit-field", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className="kit-field-label">
        {label}
      </label>
      <input
        id={id}
        className="kit-field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="kit-field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
