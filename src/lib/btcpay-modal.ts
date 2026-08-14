"use client";

/**
 * PAY WITHOUT LEAVING (Admiral, 0018.05.15): the lightning invoice opens
 * as BTCPay's modal OVER our page instead of bouncing the guest to the
 * processor's domain — the whole payment happens inside One Cocreation.
 * Falls back to the old redirect if the modal script can't load.
 *
 * Uses BTCPay's official embed: <origin>/modal/btcpay.js →
 * window.btcpay.showInvoice(id) + onModalReceiveMessage events.
 */

interface BtcpayGlobal {
  showInvoice: (id: string) => void;
  onModalReceiveMessage: (cb: (evt: MessageEvent) => void) => void;
  onModalWillLeave?: (cb: () => void) => void;
}

declare global {
  interface Window { btcpay?: BtcpayGlobal }
}

const loaders = new Map<string, Promise<boolean>>();

function loadModalScript(origin: string): Promise<boolean> {
  const have = loaders.get(origin);
  if (have) return have;
  const p = new Promise<boolean>((resolve) => {
    if (window.btcpay) return resolve(true);
    const s = document.createElement("script");
    s.src = `${origin}/modal/btcpay.js`;
    s.onload = () => resolve(!!window.btcpay);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
    setTimeout(() => resolve(!!window.btcpay), 6000);
  });
  loaders.set(origin, p);
  return p;
}

let wired = false;
let onPaidNow: (() => void) | null = null;
let onCloseNow: (() => void) | null = null;

/**
 * Open the invoice in-page. Resolves true if the modal opened; false means
 * the caller should fall back to `window.location.href = payUrl`.
 */
export async function payInModal(
  payUrl: string,
  handlers: { onPaid?: () => void; onClose?: () => void } = {},
): Promise<boolean> {
  try {
    const u = new URL(payUrl);
    const id = u.pathname.split("/i/")[1]?.split(/[/?#]/)[0];
    if (!id) return false;
    const ok = await loadModalScript(u.origin);
    if (!ok || !window.btcpay) return false;

    onPaidNow = handlers.onPaid ?? null;
    onCloseNow = handlers.onClose ?? null;
    if (!wired) {
      wired = true;
      window.btcpay.onModalReceiveMessage((evt: MessageEvent) => {
        const d = evt.data as unknown;
        if (d === "close") {
          onCloseNow?.();
          return;
        }
        if (d && typeof d === "object" && "status" in (d as Record<string, unknown>)) {
          const status = String((d as { status: unknown }).status);
          if (["paid", "confirmed", "complete", "settled"].includes(status)) {
            const cb = onPaidNow;
            onPaidNow = null; // fire once — statuses repeat
            cb?.();
          }
        }
      });
    }
    window.btcpay.showInvoice(id);
    return true;
  } catch {
    return false;
  }
}
