import { redirect } from "next/navigation";

/**
 * SCAR folded into the console: this old room redirects so bookmarks and RTFM
 * links (which point at /a/scar) still land somewhere real.
 */
export default function ScarRedirect() {
  redirect("/a");
}
