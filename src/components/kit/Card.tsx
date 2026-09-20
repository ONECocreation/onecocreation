import type { HTMLAttributes } from "react";

/**
 * kit Card (TASK-349) — the outer shell law only (house.css:205's card
 * contract, verbatim): radius 24, glass edge, the soft shadow. No forced
 * internal slot structure — the legacy `.card .thumb`/`.card .body` grid is
 * a page concern this lane doesn't own. `body` wraps children in the
 * optional `kit-card-body` padding convenience; pass `body={false}` for the
 * bare shell.
 */
export interface KitCardProps extends HTMLAttributes<HTMLDivElement> {
  body?: boolean;
}

export default function Card({ body = true, className, children, ...rest }: KitCardProps) {
  const classes = ["kit-card", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {body ? <div className="kit-card-body">{children}</div> : children}
    </div>
  );
}
