import { headers } from "next/headers";
import ConsoleShell from "@/components/console/ConsoleShell";
import SiteConsoleShell from "@/components/console/SiteConsoleShell";
import ArcadeFonts from "@/components/ArcadeFonts";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { CONSOLE_CHROME } from "@/lib/console";
/* The console's own wall (S19 lane 3): every scar-* rule + the scar token
   family, lifted verbatim out of globals.css/cartridge.css — it loads only
   here, where the console mounts, so the public site no longer carries it. */
import "../scar.css";

/**
 * The /a layout — mounts the SCAR·LET LCARS shell (elbow ribbon + top bar +
 * mobile bottom elbow bar + the BFT tray-clock) around every console room.
 * Same key-is-the-operator gate as the rooms themselves: no operator cookie,
 * no shell — the page renders its own OperatorGate bare, so the door stays a
 * door and the bridge stays behind it. Room registry + site identity come
 * from src/lib/console.ts (the console is a module, not furniture).
 * ArcadeFonts scopes the arcade skin's display face to these routes (QW9).
 */
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) return <ArcadeFonts>{children}</ArcadeFonts>;
  // Same gate, same rooms — only the chrome differs per clone (console.ts).
  const Shell = CONSOLE_CHROME === "site" ? SiteConsoleShell : ConsoleShell;
  return (
    <ArcadeFonts>
      <Shell>{children}</Shell>
    </ArcadeFonts>
  );
}
