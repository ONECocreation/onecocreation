# The classroom layouts — Video · Materials · People · Stage

Cut 0018.06.16 a₿ · TASK-123 (kimi lane). Restores the four classroom styles
of Love's List row 23 ("video, materials, people") as selectable templates on
every room at `/rooms/[slug]`. Each layout shows the same three regions —
the **video slot**, the **materials list**, and the **people rail** — in a
different arrangement, built from the same three shared components
(`RoomVideoSlot`, `RoomMaterialsShelf`, `RoomPresence`).

## How to pick one

Open any room (`/classes` → a room door). The vantage pills sit quiet in the
room bar, top right: Sanctuary · Lesson Path · The Circle · **Video ·
Materials · People · Stage**. Tap one — the choice is yours alone, remembered
in your browser (`localStorage`, never the server), and it follows you into
every room until you change it. First-time visitors still land on Sanctuary.

Rose marks the regions (a thin rose top-edge and the video heading) — an
accent only, worn through the `--rose` token name (T-121 owns the values);
the regions are always labeled in words, never by color alone.

## Video — the screen leads — `layout-video-dark.png`

The video stage takes the full width up top; the materials list and the
people rail sit side by side beneath it. This is the arrangement for a
session whose center of gravity is the screen: watch first, then reach for
the shelf and see who else is in the room.

## Materials — the shelf leads — `layout-materials-dark.png`

The materials list owns the tall main column — a recording library you read
top to bottom — while the video slot and the people rail stack in the right
rail. For a room whose recordings and PDFs ARE the class.

## People — the gathering leads — `layout-people-dark.png`

Who's here owns the tall main column — the gathering is the point — while
the video slot and the materials list stack in the right rail. For a
community room where the attendees matter more than the content.

## Stage — the spotlight — `layout-stage-dark.png`

The fourth of the restored four (named per git archaeology: "circle" is the
shipped calendar vantage and "gallery" is the studio's image block, so the
spotlight arrangement takes "stage"). The video owns the wide center stage
and the materials and people rails flank it as two equal wings — the
live-night arrangement, everything orbiting the screen.

## Proof shots (outside the repo — ~/dev/kimi/outbox/task-123/shots/)

One per layout per theme, dark + dawn: `layout-{video,materials,people,stage}-{dark,dawn}.png`
(8 shots, dev server on the lane's own :3123, vantage + theme pinned via
localStorage before load). All four layouts collapse to a single column —
video, materials, people — under 760px. The video slot is an honest embed
slot: when the room is live it raises the gold "Join Live Session" door;
otherwise the stage frame waits, labeled.
