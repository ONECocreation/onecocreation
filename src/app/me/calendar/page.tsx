import { permanentRedirect } from "next/navigation";

/**
 * TASK-405 (W-20/E4: "we have a recreation of the /me/calendar") — this
 * standalone page retires for good. `MemberCalendar` already mounts as the
 * Calendar tab on `/me` for both member kinds (MeSwitch.tsx); this address
 * was a true duplicate surface. A permanent (308) redirect forwards here
 * so browsers and crawlers can forget the old address — `/me/calendar` by
 * hand lands the visitor on that very same tab. The redirect runs before
 * any session read and carries the ordinary cookies, so a signed-out
 * visitor lands on `/me`'s own sign-in branch, exactly as visiting `/me`
 * directly does — never a calendar.
 */
export default function CalendarRedirect() {
  permanentRedirect("/me?tab=calendar");
}
