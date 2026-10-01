import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-491 (block 969,301, SCOPE-letters lane 1): ONE TRUE RENDER for every
 * letter. The admin preview and every automatic send pour from the SAME
 * letterHtml(); the five drifting senders (lead-magnet, the three pwyc
 * letters, order-receipt) stop drifting, and the meditation's hardcoded gold
 * pill retires into a !cta: line in Love's own body (Download points at
 * T-492's /meditation/download, Listen at the static
 * /audio/unzip-into-the-new-you.mp3; the stale admin-host link dies with the
 * rewrite).
 *
 * Pins:
 *  1. the lead-magnet DEFAULT body carries the button as a !cta: line plus a
 *     Listen markdown line, and renders both doors through the rich shell.
 *  2. DRIFT-KILLERS, one per drifting sender: an override body carrying a
 *     !cta: line sends the rendered button, never literal "!cta:" text.
 *  3. the one-render law: an override WITHOUT a !cta: line renders no button
 *     (the button lives in the body now; the preview IS the send).
 *  4. PREVIEW-EQUALS-SENT for the EDITABLE_LETTERS keys with sample
 *     slots (nine cases; TASK-518 added purchase-love-notify — T-493 left
 *     read-with-love without a case, a gap named in T-518's SUMMARY):
 *     the sender's html string-equals letterHtml()/letterFor() of the
 *     same resolved body. This lane exports letterFor exactly so the slot
 *     letters' documents reconstruct from exported pieces (makeOfferToken,
 *     pill, mintOrderKeyFor; the fragments pinned by content).
 *  5. the slot doctrine: a slot Love leaves out of her override is appended
 *     as its own block at the end of the body BEFORE render, so it still
 *     lands inside the shell; a placed slot substitutes in place.
 *  6. grep pin: no stale admin-host literal anywhere under src/.
 *
 * The mail rail, the drip queue, the letter-override store and the operator
 * gate are mocked; the vault is a stateful fixture KV behind a stubbed
 * global fetch (the order-receipt.test.ts pattern). Every credential below
 * is a fixture string, never a real one.
 */

const KV_URL = "http://kv.fixture";
const SITE = "https://onecocreation.test";
const FROZEN = new Date("2026-09-30T12:00:00.000Z").getTime();
const ORDER_ID = "0123456789abcdef01234567";
const PILL_FILL = 'bgcolor="#AD5470"'; // the rich shell's rendered button (mail.ts pill)

const sentMail = vi.hoisted(() => [] as Array<{ to: string; subject: string; html: string }>);
const enqueued = vi.hoisted(() => [] as Array<Array<{ to: string; subject: string; html: string }>>);
const overrides = vi.hoisted(() => new Map<string, { subject: string; body: string }>());

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    sendMail: async (_persona: string, mail: { to: string; subject: string; html: string }) => {
      sentMail.push(mail);
    },
  };
});

vi.mock("@/lib/mail-queue", () => ({
  enqueue: async (jobs: Array<{ to: string; subject: string; html: string }>) => {
    enqueued.push(jobs);
    return jobs.length;
  },
}));

vi.mock("@/lib/letters", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/letters")>();
  return {
    ...actual,
    getLetterOverride: async (key: string) => overrides.get(key) ?? null,
  };
});

vi.mock("@/lib/operator-auth", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    operatorFromCookieHeader: () => ({ npub: "fixture-operator" }),
  };
});

/** the meditation on the shelf, with a paid deliverable (fixture) */
const CATALOG = {
  schemaVersion: 2,
  items: [
    {
      id: "thank-you-wakeup",
      schemaVersion: 2,
      title: "Thank You Wake Up Affirmations",
      blurb: "Wake Up Affirmations · 1 hr 11 min",
      images: ["/images/affirmation-thankyou.webp"],
      media: {
        images: ["/images/affirmation-thankyou.webp"],
        deliverable: { kind: "audio", label: "the affirmations audio", blobPath: "deliverables/fixture-meditation.mp3" },
      },
      kind: "digital",
      price: { sats: 11111, fiat: { amount: 1100, currency: "USD" } },
      fulfillment: "digital",
      status: "live",
    },
  ],
};

/** stateful fixture KV - SET remembers (NX honored), GET reads back */
const kvStore = new Map<string, string>();

beforeAll(async () => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  delete process.env.SQUARE_ACCESS_TOKEN;
  delete process.env.SQUARE_LOCATION_ID;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === KV_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      const [op, key] = cmd.map(String);
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(key) ?? null;
      else if (op === "SET") {
        const [, k, v, flag] = cmd.map(String);
        if (flag === "NX" && kvStore.has(k)) result = null;
        else { kvStore.set(k, v); result = "OK"; }
      } else if (op === "SADD" || op === "INCR" || op === "EXPIRE" || op === "DEL") result = 1;
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

beforeEach(() => {
  kvStore.clear();
  kvStore.set("store:catalog", JSON.stringify(CATALOG));
  sentMail.length = 0;
  enqueued.length = 0;
  overrides.clear();
});

const letters = () => import("@/lib/letters");
const leadMagnet = () => import("@/lib/lead-magnet");
const pwyc = () => import("@/lib/pwyc-letters");

function freezeTime() {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN);
}

/** an order carrying a give-what-you-can offer (fixture) */
function offerOrder(over: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    schemaVersion: 2,
    state: "charge_created",
    lineItems: [
      { itemId: "thank-you-wakeup", title: "Thank You Wake Up Affirmations", qty: 1, offerSats: 9000, listSats: 11111 },
    ],
    priceSnapshot: { amount: 1100, currency: "USD", at: new Date(FROZEN).toISOString() },
    adapterId: "btcpay",
    chargeIds: [],
    entitlementSubject: "soul@example.com@email",
    contact: { email: "soul@example.com" },
    createdAtMs: FROZEN,
    events: [],
    pwycPending: true,
    ...over,
  } as never;
}

/** a settled store order on the catalog fixture (no offer) */
function receiptOrder() {
  return {
    id: ORDER_ID,
    schemaVersion: 2,
    state: "settled",
    lineItems: [{ itemId: "thank-you-wakeup", title: "Thank You Wake Up Affirmations", qty: 1 }],
    priceSnapshot: { amount: 1100, currency: "USD", at: new Date(FROZEN).toISOString() },
    adapterId: "square",
    chargeIds: ["ch_fixture"],
    entitlementSubject: "soul@example.com@email",
    contact: { email: "soul@example.com" },
    createdAtMs: FROZEN,
    events: [],
  } as never;
}

/* the machine-built fragments, pinned by content (the brief's sanction):
   byte-shapes copied from src/lib/pwyc-letters.ts so a drift in the module
   breaks this suite, never ships silent */
const buyerLinesFragment = `<ul style="margin:0 0 1.15em;padding-left:22px;line-height:1.75;"><li><b>Thank You Wake Up Affirmations</b> — your ${(9000).toLocaleString()} sats (listed ${(11111).toLocaleString()})</li></ul>`;
const refundReplyFragment = `<p style="margin:0 0 1.15em;line-height:1.75;">Reply to this letter with a bitcoin address and they'll be on their way.</p>`;

async function offerSlots() {
  const { makeOfferToken } = await pwyc();
  const { pill } = await import("@/lib/mail");
  const acceptUrl = `${SITE}/api/offer-action?token=${makeOfferToken(ORDER_ID, "accept")}`;
  const declineUrl = `${SITE}/api/offer-action?token=${makeOfferToken(ORDER_ID, "decline")}`;
  return {
    who: `<p style="margin:0 0 1.15em;line-height:1.75;">From <b>soul@example.com</b> · order ${ORDER_ID.slice(0, 8)}</p>`,
    lines:
      `<ul style="margin:0 0 1.15em;padding-left:22px;line-height:1.75;"><li><b>Thank You Wake Up Affirmations</b> — offered ${(9000).toLocaleString()} sats (listed ${(11111).toLocaleString()})</li></ul>` +
      `<p style="margin:0 0 1.15em;line-height:1.75;color:#9a8fae;">The gap: <b>${(2111).toLocaleString()} sats</b> — accepted, the Pay-It-Forward jar may carry it.</p>`,
    doors: `<div style="margin:6px 0 18px;">${pill(acceptUrl, "💛 Accept with love", "lg")}&nbsp;&nbsp;${pill(declineUrl, "🕊️ Decline, with care", "lg")}</div>`,
  };
}

describe("the lead-magnet default carries the button in Love's own format", () => {
  it("the default body: a !cta: download line plus a Listen markdown line; subject and stale host", async () => {
    const { LETTER_DEFAULTS } = await letters();
    const tpl = LETTER_DEFAULTS["lead-magnet"]!;
    expect(tpl.subject).toBe("Your free meditation — Unzip Into the New You");
    expect(tpl.body).toContain("!cta: Download: Unzip Into the New You | /meditation/download");
    expect(tpl.body).toContain("[Listen in your browser](/audio/unzip-into-the-new-you.mp3)");
    expect(tpl.body).not.toContain("onecocreation-adminpacmans");
  });

  it("the default renders both doors through the rich shell, never literal directives", async () => {
    const { LETTER_DEFAULTS, letterHtml } = await letters();
    const html = letterHtml(LETTER_DEFAULTS["lead-magnet"]!.body);
    expect(html).toContain(`href="${SITE}/meditation/download"`); // the Download pill
    expect(html).toContain(`href="${SITE}/audio/unzip-into-the-new-you.mp3"`); // the Listen link
    expect(html).toContain("Download");
    expect(html).toContain("Listen");
    expect(html).toContain("Unzip Into the New You");
    expect(html).not.toContain("!cta:");
  });

  it("grep pin: no stale admin-host literal anywhere under src/", async () => {
    const hits: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(p);
        else if (/\.(ts|tsx|js|jsx|css|json)$/.test(entry.name)) {
          if ((await fs.readFile(p, "utf8")).includes("onecocreation-adminpacmans")) hits.push(p);
        }
      }
    };
    await walk(path.join(process.cwd(), "src"));
    expect(hits).toEqual([]);
  });
});

describe("drift-killers: an override's !cta: line sends as the rendered button, one per drifting sender", () => {
  it("lead-magnet (sendLeadMagnetLetter)", async () => {
    overrides.set("lead-magnet", {
      subject: "Your free meditation",
      body: `Welcome, beautiful soul. Here is your gift.
!cta: Download: Unzip Into the New You | /meditation/download
[Listen in your browser](/audio/unzip-into-the-new-you.mp3)`,
    });
    const { sendLeadMagnetLetter } = await leadMagnet();
    await sendLeadMagnetLetter("reader@example.com");
    expect(sentMail).toHaveLength(1);
    const html = sentMail[0].html;
    expect(html).not.toContain("!cta:");
    expect(html).toContain(PILL_FILL);
    expect(html).toContain(`href="${SITE}/meditation/download"`);
    expect(html).toContain(`href="${SITE}/audio/unzip-into-the-new-you.mp3"`);
  });

  it("offer-love-notify (sendOfferNotify)", async () => {
    overrides.set("offer-love-notify", {
      subject: "offer",
      body: "Someone gave what they could.\n\n{{lines}}\n\n!cta: Open the offers desk | /a/offers",
    });
    const { sendOfferNotify } = await pwyc();
    await sendOfferNotify(offerOrder());
    expect(enqueued).toHaveLength(1);
    const html = enqueued[0][0].html;
    expect(html).not.toContain("!cta:");
    expect(html).not.toContain("{{lines}}");
    expect(html).toContain(PILL_FILL);
    expect(html).toContain(`href="${SITE}/a/offers"`);
  });

  it("pwyc-accept (decideOfferWithLetters)", async () => {
    overrides.set("pwyc-accept", {
      subject: "yes",
      body: "It is a yes.\n\n{{lines}}\n\n!cta: Step into the field | /memberships",
    });
    const { createOrder } = await import("@/lib/store");
    await createOrder(offerOrder());
    const { decideOfferWithLetters } = await pwyc();
    const res = await decideOfferWithLetters(ORDER_ID, "accept", "email");
    expect(res).not.toBeNull();
    expect(enqueued).toHaveLength(1);
    const html = enqueued[0][0].html;
    expect(html).not.toContain("!cta:");
    expect(html).toContain(PILL_FILL);
    expect(html).toContain(`href="${SITE}/memberships"`);
  });

  it("pwyc-decline (decideOfferWithLetters)", async () => {
    overrides.set("pwyc-decline", {
      subject: "no",
      body: "With love, your sats come back.\n\n{{lines}}\n\n{{refund}}\n\n!cta: The jars carry it | /support",
    });
    const { createOrder } = await import("@/lib/store");
    await createOrder(offerOrder());
    const { decideOfferWithLetters } = await pwyc();
    const res = await decideOfferWithLetters(ORDER_ID, "decline", "email");
    expect(res).not.toBeNull();
    expect(enqueued).toHaveLength(1);
    const html = enqueued[0][0].html;
    expect(html).not.toContain("!cta:");
    expect(html).toContain(PILL_FILL);
    expect(html).toContain(`href="${SITE}/support"`);
  });

  it("order-receipt (buildReceiptLetter)", async () => {
    overrides.set("order-receipt", {
      subject: "receipt",
      body: "Thank you.\n\n{{lines}}\n\n{{door}}\n\n!cta: Your memberships | /memberships",
    });
    const { buildReceiptLetter } = await import("@/lib/order-receipt");
    const built = await buildReceiptLetter(receiptOrder());
    expect(built.html).not.toContain("!cta:");
    expect(built.html).toContain(PILL_FILL);
    expect(built.html).toContain(`href="${SITE}/memberships"`);
  });
});

describe("the one-render law: an override without a !cta: line renders no button", () => {
  it("sendLeadMagnetLetter sends exactly the saved body, the retired pill stays retired", async () => {
    overrides.set("lead-magnet", {
      subject: "Your free meditation",
      body: "Welcome, beautiful soul. Here is your gift, with love.",
    });
    const { sendLeadMagnetLetter } = await leadMagnet();
    await sendLeadMagnetLetter("reader@example.com");
    expect(sentMail).toHaveLength(1);
    const html = sentMail[0].html;
    expect(html).not.toContain("!cta:");
    expect(html).not.toContain(PILL_FILL); // no button at all
    expect(html).not.toContain("/meditation/download"); // the hardcoded pill never sneaks back
    expect(html).not.toContain("unzip-into-the-new-you.mp3");
  });
});

describe("preview equals sent: eleven EDITABLE_LETTERS keys with sample slots", () => {
  it("lead-magnet: sendLeadMagnetLetter string-equals letterHtml of the same resolved body", async () => {
    const { sendLeadMagnetLetter } = await leadMagnet();
    await sendLeadMagnetLetter("reader@example.com");
    expect(sentMail).toHaveLength(1);
    const { LETTER_DEFAULTS, letterHtml } = await letters();
    const { unsubscribeUrl } = await import("@/lib/subscribers");
    expect(sentMail[0].subject).toBe("Your free meditation — Unzip Into the New You");
    expect(sentMail[0].html).toBe(
      letterHtml(LETTER_DEFAULTS["lead-magnet"]!.body, { unsubscribeUrl: unsubscribeUrl("reader@example.com") }),
    );
  });

  it("welcome: enqueueWelcomeLetter string-equals letterHtml of the default", async () => {
    const { enqueueWelcomeLetter } = await leadMagnet();
    await enqueueWelcomeLetter("reader@example.com");
    expect(enqueued).toHaveLength(1);
    const { LETTER_DEFAULTS, letterHtml } = await letters();
    const { unsubscribeUrl } = await import("@/lib/subscribers");
    expect(enqueued[0][0].html).toBe(
      letterHtml(LETTER_DEFAULTS.welcome!.body, { unsubscribeUrl: unsubscribeUrl("reader@example.com") }),
    );
  });

  it("welcome-day-two: enqueueDayTwoWelcome string-equals letterHtml of the default", async () => {
    const { enqueueDayTwoWelcome } = await leadMagnet();
    await enqueueDayTwoWelcome("reader@example.com");
    expect(enqueued).toHaveLength(1);
    const { LETTER_DEFAULTS, letterHtml } = await letters();
    const { unsubscribeUrl } = await import("@/lib/subscribers");
    expect(enqueued[0][0].html).toBe(
      letterHtml(LETTER_DEFAULTS["welcome-day-two"]!.body, { unsubscribeUrl: unsubscribeUrl("reader@example.com") }),
    );
  });

  it("news-sample: the publish route's test copy string-equals its own htmlFor shape", async () => {
    const { POST } = await import("@/app/api/admin/letters/send/route");
    const res = await POST(
      new Request("http://localhost/api/admin/letters/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "oc_operator=fixture" },
        body: JSON.stringify({ key: "news-sample", testTo: "reader@example.com" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(enqueued).toHaveLength(1);
    const job = enqueued[0][0];
    const { LETTER_DEFAULTS, letterHtml } = await letters();
    const { unsubscribeUrl } = await import("@/lib/subscribers");
    expect(job.subject).toBe("[test] Greetings and Cheers — from One Cocreation");
    expect(job.html).toBe(
      letterHtml(LETTER_DEFAULTS["news-sample"]!.body, {
        webUrl: "/letters/news-sample",
        unsubscribeUrl: unsubscribeUrl("reader@example.com"),
      }),
    );
  });

  it("offer-love-notify: sendOfferNotify string-equals letterFor with the same machine parts", async () => {
    freezeTime();
    try {
      const { sendOfferNotify, letterFor } = await pwyc();
      const slots = await offerSlots();
      await sendOfferNotify(offerOrder());
      const expected = await letterFor("offer-love-notify", slots);
      expect(enqueued).toHaveLength(1);
      expect(enqueued[0][0].to).toBe("love@onecocreation.com");
      expect(enqueued[0][0].subject).toBe(expected.subject);
      expect(enqueued[0][0].html).toBe(expected.html);
    } finally {
      vi.useRealTimers();
    }
  });

  it("pwyc-accept: decideOfferWithLetters string-equals letterFor with the same machine parts", async () => {
    const { createOrder } = await import("@/lib/store");
    await createOrder(offerOrder());
    const { decideOfferWithLetters, letterFor } = await pwyc();
    const res = await decideOfferWithLetters(ORDER_ID, "accept", "email");
    expect(res).not.toBeNull();
    const expected = await letterFor("pwyc-accept", { lines: buyerLinesFragment });
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0][0].to).toBe("soul@example.com");
    expect(enqueued[0][0].html).toBe(expected.html);
  });

  it("pwyc-decline: decideOfferWithLetters string-equals letterFor with the same machine parts", async () => {
    const { createOrder } = await import("@/lib/store");
    await createOrder(offerOrder());
    const { decideOfferWithLetters, letterFor } = await pwyc();
    const res = await decideOfferWithLetters(ORDER_ID, "decline", "email");
    expect(res).not.toBeNull();
    const expected = await letterFor("pwyc-decline", { lines: buyerLinesFragment, refund: refundReplyFragment });
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0][0].to).toBe("soul@example.com");
    expect(enqueued[0][0].html).toBe(expected.html);
  });

  it("order-receipt: buildReceiptLetter string-equals letterHtml of the resolved body", async () => {
    freezeTime();
    try {
      const { buildReceiptLetter, mintOrderKeyFor } = await import("@/lib/order-receipt");
      const { LETTER_DEFAULTS, letterHtml } = await letters();
      const built = await buildReceiptLetter(receiptOrder());
      const key = mintOrderKeyFor(ORDER_ID, "soul@example.com", "letter")!;
      const door = `Your download door — signed for you alone, no sign-in needed:\n[Open your download](${SITE}/store/order/${ORDER_ID}?key=${key})`;
      // 1100 minor USD reads "$11" exactly (money-words dollars(); the same
      // words order-receipt.test.ts:204 pins inside the sent html)
      const lines = `• Thank You Wake Up Affirmations\n\nAs paid: $11`;
      const resolved = LETTER_DEFAULTS["order-receipt"]!.body
        .replace("{{lines}}", lines)
        .replace("{{door}}", door)
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      expect(built.subject).toBe("Your order — received with love");
      expect(built.html).toBe(letterHtml(resolved));
    } finally {
      vi.useRealTimers();
    }
  });

  /* TASK-518: the purchase letter to Love pours from the same composer —
     the send string-equals the exported build of the same order (the
     build is letterFor + the five machine slots; the marker and the
     switch live outside the words) */
  it("purchase-love-notify: sendPurchaseLoveNotify string-equals buildPurchaseLoveNotify of the same order", async () => {
    const { sendPurchaseLoveNotify, buildPurchaseLoveNotify } = await import("@/lib/purchase-love-notify");
    const order = receiptOrder(); // a settled store order on the catalog fixture
    const expected = await buildPurchaseLoveNotify(order);
    const res = await sendPurchaseLoveNotify(order);
    expect(res).toEqual({ sent: true });
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0].to).toBe("love@onecocreation.com");
    expect(sentMail[0].subject).toBe("A purchase just settled");
    expect(sentMail[0].subject).toBe(expected.subject);
    expect(sentMail[0].html).toBe(expected.html);
    expect(sentMail[0].html).not.toMatch(/\{\{[a-z]+\}\}/); // no raw slot ever ships
  });

  /* TASK-519: the join letters pour from the same composer too — each
     builder string-equals letterFor of the same machine parts (the
     {{session}}/{{when}}/{{link}} fragments pinned by content, the
     byte-shape copied from src/lib/join-letters.ts so a drift in the
     module breaks this suite, never ships silent) */
  const JOIN_STARTS = Date.parse("2026-09-23T19:11:00.000Z"); // Wednesday 1:11 PM MDT
  const joinParts = {
    session: "the reading",
    startsAtMs: JOIN_STARTS,
    tz: "America/Denver",
    link: `${SITE}/reading`,
    linkWords: "Open the reading page",
  };
  const joinLinkFragment = `<p style="margin:22px 0;"><a href="${SITE}/reading" style="background:#b4862b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;">Open the reading page</a></p>`;

  it("join-reminder: joinReminderLetter string-equals letterFor with the same machine parts (TASK-519)", async () => {
    const { joinReminderLetter } = await import("@/lib/join-letters");
    const { letterFor } = await pwyc();
    const built = await joinReminderLetter("reader@example.com", joinParts);
    const expected = await letterFor("join-reminder", {
      session: `<p style="margin:0 0 1.15em;line-height:1.75;">The session: <b>the reading</b>.</p>`,
      when: `<p style="margin:0 0 1.15em;line-height:1.75;">It begins <b>Wednesday, September 23 at 1:11 PM Mountain</b>.</p>`,
      link: joinLinkFragment,
    });
    expect(built.to).toBe("reader@example.com");
    expect(built.subject).toBe("Your session is coming: the link and the time");
    expect(built.subject).toBe(expected.subject);
    expect(built.html).toBe(expected.html);
    expect(built.html).not.toMatch(/\{\{[a-z]+\}\}/); // no raw slot ever ships
  });

  it("join-start: joinStartLetter string-equals letterFor with the same machine parts (TASK-519)", async () => {
    const { joinStartLetter } = await import("@/lib/join-letters");
    const { letterFor } = await pwyc();
    const built = await joinStartLetter("reader@example.com", joinParts);
    const expected = await letterFor("join-start", {
      session: `<p style="margin:0 0 1.15em;line-height:1.75;">The session: <b>the reading</b>.</p>`,
      when: `<p style="margin:0 0 1.15em;line-height:1.75;">It opened <b>Wednesday, September 23 at 1:11 PM Mountain</b>.</p>`,
      link: joinLinkFragment,
    });
    expect(built.to).toBe("reader@example.com");
    expect(built.subject).toBe("The room is open: come on in");
    expect(built.subject).toBe(expected.subject);
    expect(built.html).toBe(expected.html);
    expect(built.html).not.toMatch(/\{\{[a-z]+\}\}/); // no raw slot ever ships
  });
});

describe("the slot doctrine survives the one render", () => {
  it("a placed slot substitutes in place (the default body's own block)", async () => {
    const { letterFor } = await pwyc();
    const { LETTER_DEFAULTS, letterHtml } = await letters();
    const sample = "<p>sample lines block</p>";
    const { html } = await letterFor("pwyc-accept", { lines: sample });
    const body = LETTER_DEFAULTS["pwyc-accept"]!.body.split("{{lines}}").join("\u0000lines\u0000");
    let expected = letterHtml(body);
    expected = expected.split('<p style="margin:0 0 1.15em;line-height:1.75;">\u0000lines\u0000</p>').join(sample);
    expected = expected.split("\u0000lines\u0000").join(sample);
    expect(html).toBe(expected);
    expect(html).toContain(sample);
  });

  it("a slot Love leaves out is appended as its own block at the end of the body, inside the shell", async () => {
    overrides.set("pwyc-accept", { subject: "yes", body: "It is a yes, with love." });
    const { letterFor } = await pwyc();
    const { letterHtml } = await letters();
    const sample = "<p>sample machine part</p>";
    const { html } = await letterFor("pwyc-accept", { lines: sample });
    let expected = letterHtml("It is a yes, with love.\n\n\u0000lines\u0000");
    expected = expected.split('<p style="margin:0 0 1.15em;line-height:1.75;">\u0000lines\u0000</p>').join(sample);
    expected = expected.split("\u0000lines\u0000").join(sample);
    expect(html).toBe(expected);
    expect(html.indexOf(sample)).toBeGreaterThan(html.indexOf("It is a yes"));
  });
});
