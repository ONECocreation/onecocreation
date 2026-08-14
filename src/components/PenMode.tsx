"use client";

import { createContext, useContext, useEffect, useState } from "react";
import useIsOperator from "@/hooks/useIsOperator";

/**
 * Love's Pen — the shared "is the pen on" state (P1, 2026-08-10). Lives at
 * the root (RootLayout) so the header's toggle and every <Editable> on the
 * page agree without each one polling. Off by default and doesn't persist
 * across navigation (the scope doc's call: edit mode is a deliberate,
 * session-local stance, not a sticky preference like the theme).
 */
interface PenModeCtx {
  isOperator: boolean;
  penOn: boolean;
  setPenOn: (v: boolean) => void;
}

const Ctx = createContext<PenModeCtx>({ isOperator: false, penOn: false, setPenOn: () => {} });

export function PenModeProvider({ children }: { children: React.ReactNode }) {
  const isOperator = useIsOperator();
  const [penOn, setPenOn] = useState(false);

  // a dropped/expired operator session takes the pen out of Love's hand too
  useEffect(() => {
    if (!isOperator && penOn) setPenOn(false);
  }, [isOperator, penOn]);

  return <Ctx.Provider value={{ isOperator, penOn, setPenOn }}>{children}</Ctx.Provider>;
}

export function usePenMode(): PenModeCtx {
  return useContext(Ctx);
}
