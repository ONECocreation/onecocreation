import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-239 (0018.06.23 a₿ · block 966,895) — the ONE video that plays at the
 * top of /about, Love's Sep 8 ask: "This could be an instant play thing
 * with the ability to mute on there. Top of about pg? Welcome Home to You."
 * (https://youtu.be/YAJMh0qoftI).
 *
 * `video` comes from `SiteConfig.about.featured` (site-config.ts) — absent
 * (never pasted, or cleared on /a/site/about-videos) renders nothing at
 * all: no placeholder box (derive-or-dash). Autoplay only ever starts
 * muted — that's a YouTube policy, not a house choice — so the visitor's
 * own tap on the player's speaker icon is what unmutes it; the line below
 * says so instead of the house building a custom mute control.
 *
 * Framed 16/9 regardless of the saved `ratio` field: this slot is always
 * the wide hero frame, never the playlist's portrait shape — the `ratio`
 * field rides along only because `featured` shares the exact `AboutVideo`
 * shape the playlist rows use (site-config.ts's note on the type).
 */
export default function AboutFeatured({ video }: { video: AboutVideo | undefined }) {
  if (!video) return null;
  return (
    <div className="wrap about-featured" style={{ maxWidth: 860, margin: "48px auto", padding: "0 22px" }}>
      <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: 18, overflow: "hidden",
        boxShadow: "0 26px 60px -24px rgba(35,26,60,.55)" }}>
        <iframe
          loading="eager"
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&playsinline=1&rel=0`}
          title={video.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          allow="autoplay; encrypted-media"
        />
      </div>
      <p style={{ fontFamily: "var(--font-body-app)", fontSize: "1rem", color: "var(--ink-strong)",
        textAlign: "center", margin: "16px 0 4px" }}>
        {video.title}
      </p>
      <p style={{ fontSize: ".85rem", color: "var(--muted)", textAlign: "center", margin: 0 }}>
        Tap the speaker to hear her
      </p>
    </div>
  );
}
