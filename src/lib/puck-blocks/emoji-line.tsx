/**
 * EmojiLine block (TASK-611, L18) - the three glyphs of /memberships drawn
 * on a line of their own, in the /book header's class at the /book
 * size (`constellation constellation-center`, house.css; r2: same size as /book). LOCAL block: the
 * vendored Text block cannot carry a class and stays untouched. The stored
 * doc is never edited; applyEmojiLineToPuck (puck-seeds.ts) inserts this
 * block at render time. Decorative, so aria-hidden like the /book line.
 */
export function createEmojiLine() {
  return {
    label: "Emoji line (large, centred)",
    fields: { text: { type: "text" as const, label: "Glyphs" } },
    defaultProps: { text: "🌈 💕 🦁" },
    render: ({ text }: { text?: string }) => (
      <div className="constellation constellation-center" aria-hidden>{text}</div>
    ),
  };
}
