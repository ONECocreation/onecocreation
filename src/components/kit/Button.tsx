import type { ButtonHTMLAttributes } from "react";

/**
 * kit Button (TASK-349, lane 1 of the OC UI kit) — reads house.css's `.btn`
 * fill law through kit.css's `kit-btn*` classes; no inline token values.
 *
 * Variants: `main` (the .btn/.btn-rose fill), `second` (the .btn-ghost
 * pairing), `quiet` (the .btn-quiet link typography). `sm` composes with
 * either fill variant for the `.btn-sm` padding/size delta (house.css:128).
 *
 * R-071 (the Admiral, MOCKUPS-1): button text never wraps. `white-space:
 * nowrap` sits on the shared `.kit-btn` base, unconditionally, for every
 * variant — see src/app/kit.css.
 */
export type KitButtonVariant = "main" | "second" | "quiet";

export interface KitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: KitButtonVariant;
  sm?: boolean;
}

export default function Button({ variant = "main", sm = false, className, children, ...rest }: KitButtonProps) {
  const variantClass = variant === "second" ? "kit-btn-second" : variant === "quiet" ? "kit-btn-quiet" : "kit-btn-main";
  const classes = ["kit-btn", variantClass, sm ? "kit-btn-sm" : "", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
