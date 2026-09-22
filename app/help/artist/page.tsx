'use client'

import { HelpA, HelpDoc, HelpH2, HelpP } from '@/components/help-doc'

export default function HelpArtistPage() {
  return (
    <HelpDoc kicker="Help" title="Artists">
      <HelpH2>Apply</HelpH2>
      <HelpP>
        Sign in, then open <HelpA href="/apply-artist">Apply as an artist</HelpA>. Add your name, links, and a short note. You&rsquo;ll hear back in-app.
      </HelpP>

      <HelpH2>Upload</HelpH2>
      <HelpP>
        After you&rsquo;re approved, <HelpA href="/studio">Studio</HelpA> is where you add audio, artwork, and lyrics. Publish when the track is ready.
      </HelpP>

      <HelpH2>Promote</HelpH2>
      <HelpP>
        Auto-Promote can send Moments to YouTube. Connect YouTube from Studio when you want that on.
      </HelpP>
    </HelpDoc>
  )
}
