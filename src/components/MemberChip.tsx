"use client";

import { PixelAvatar } from "@pacsarcade/arcade-ui";
import useMemberSession from "@/hooks/useMemberSession";
import useNostrProfile from "@/hooks/useNostrProfile";

/**
 * The face on the marquee — rendered INSIDE SiteHeader's trigger button
 * (identityAsTrigger), so no links or buttons in here: pressing the chip
 * opens the menu, and navigation lives in the menu rows.
 *
 * Signed out: the vacant ghost — nobody's home, press to find the door.
 * Signed in: the member's kind-0 picture, or their seeded pixel body.
 */
export default function MemberChip() {
  const { member, checked } = useMemberSession();
  const { profile } = useNostrProfile(member?.npub);

  if (!checked) return <span className="w-8" aria-hidden />;

  if (!member) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <PixelAvatar variant="ghost" size={32} />
        <span className="hidden whitespace-nowrap font-pixel text-[10px] text-coin glow-coin md:block">
          LOGIN
        </span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      {profile?.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.picture}
          alt=""
          className="h-8 w-8 flex-none border-2 border-cyan object-cover"
        />
      ) : (
        <PixelAvatar variant="player" seed={member.handle} size={32} />
      )}
      <span
        className={`hidden max-w-28 truncate font-pixel text-[10px] md:block ${
          member.space === "pacsarcade" ? "text-pink" : "text-cyan"
        }`}
      >
        {member.handle.toUpperCase()}
      </span>
    </span>
  );
}
