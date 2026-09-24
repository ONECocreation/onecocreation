"use client";

import { useEffect, useRef, useState } from "react";

/**
 * JITSI VIEWER (TASK-438, block 968,222; HOLD LIFTED block 968,269) — the
 * WATCH-ONLY Stage 1 embed: Love's picture and sound, nothing else. The
 * one-way law lives in the configOverwrite below (checked against
 * FACTS-jitsi-one-way.md's viewer table): the viewer's own media is never
 * asked for (no initial GUM, both tracks born muted, no prejoin step);
 * chat, the self-view, shortcuts, reactions, polls, the conference
 * subject, deep-linking, the filmstrip, the participants pane and the
 * remote-tile menu are all off; one remote tile only; P2P is off so every
 * viewer rides the bridge; the toolbar is exactly fullscreen + hangup.
 * No "start-silent"-style key either: those kill REMOTE audio — the whole
 * point of watching.
 *
 * The iframe's allow list is deliberately NOT set here: upstream's
 * external_api.js always writes one (fullscreen included — FACTS §b), so
 * a local override could only fight upstream, never harden it. The
 * viewer-side safety is this config plus the SERVER-side moderator locks
 * (these are viewer controls, not the server boundary — the brief's
 * Build 4).
 *
 * The lifecycle mirrors JitsiRoom.tsx:93-102 (the script guard, both
 * farewell events, dispose on unmount) with two deliberate differences:
 * a failed script load reports up through `onFailed` (ReadingStage shows
 * the honest words and the Try again control) — there is NEVER a raw-room
 * link to fall back to here; and the Window API declaration is NOT
 * repeated (JitsiRoom.tsx:25-32 owns the one declaration).
 */
export default function JitsiViewer({
  domain,
  room,
  onEnded,
  onFailed,
}: {
  domain: string;
  room: string;
  /** both farewell events (the viewer's own hangup AND the host ending
   *  the call) land here — never on a third-party farewell page. */
  onEnded: () => void;
  /** the script itself failed to load — ReadingStage owns the words. */
  onFailed: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let api: { dispose: () => void } | null = null;
    let live = true;

    const boot = () => {
      if (!live || !holder.current || !window.JitsiMeetExternalAPI) return;
      const a = new window.JitsiMeetExternalAPI(domain, {
        roomName: room,
        parentNode: holder.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: "Guest" },
        configOverwrite: {
          /* the viewer's own media is never requested */
          disableInitialGUM: true,
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          prejoinConfig: { enabled: false },
          /* every surface a viewer doesn't own is off */
          disableChat: true,
          disableSelfView: true,
          disableShortcuts: true,
          disableReactions: true,
          disablePolls: true,
          hideConferenceSubject: true,
          disableDeepLinking: true,
          filmstrip: { disabled: true },
          participantsPane: { enabled: false },
          remoteVideoMenu: { disabled: true },
          /* one remote tile, and every viewer rides the bridge */
          channelLastN: 1,
          p2p: { enabled: false },
          requireDisplayName: false,
          toolbarButtons: ["fullscreen", "hangup"],
        },
      });
      api = a;
      setLoading(false);
      a.addListener("videoConferenceLeft", () => {
        if (live) onEnded();
      });
      a.addListener("readyToClose", () => {
        if (live) onEnded();
      });
    };

    if (window.JitsiMeetExternalAPI) boot();
    else {
      const s = document.createElement("script");
      s.src = `https://${domain}/external_api.js`;
      s.async = true;
      s.onload = boot;
      s.onerror = () => {
        if (live) onFailed();
      };
      document.body.appendChild(s);
    }
    return () => {
      live = false;
      api?.dispose();
    };
  }, [domain, room, onEnded, onFailed]);

  return (
    <div className="kit-stage-viewer">
      <div ref={holder} className="kit-stage-viewer-frame" />
      {loading && <p className="kit-stage-viewer-status">Opening Love&apos;s picture…</p>}
    </div>
  );
}
