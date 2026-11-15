import { getSiteConfig } from "./site-config";
import { liveAdapter } from "./payments";

/**
 * lane/oc-sats-when-bitcoin-on (block 976,021 — the Admiral's pin: "only
 * show sats when bitcoin is on"). ONE question every public page asks
 * before it draws a sats word, a sats price or a sats switch: is the
 * bitcoin rail live right now?
 *
 * No new switch: this is the house's own rail truth — liveAdapter() (the
 * /a/site `payments.btcpay` switch AND a configured btcpay env, T-129),
 * the same answer sections.tsx's liveRails().btc and packages/[slug]'s
 * btcpayLive already read. WARM BEFORE YOU JUDGE (T-186's idiom):
 * getSiteConfig() first, so liveAdapter()'s sync switch cache is this
 * request's, never the last one's.
 */
export async function satsShown(): Promise<boolean> {
  await getSiteConfig();
  return liveAdapter() !== null;
}
