'use client'

import { HelpA, HelpDoc, HelpH2, HelpP } from '@/components/help-doc'

export default function FaqPage() {
  return (
    <HelpDoc kicker="FAQ" title="FAQ">
      <HelpH2>What is Margo?</HelpH2>
      <HelpP>
        A place to talk in lyrics. Share a line, hear it, send a Lyric Back. More in <HelpA href="/about">About</HelpA>.
      </HelpP>

      <HelpH2>How do I join?</HelpH2>
      <HelpP>
        <HelpA href="/help/account">Sign in &amp; sign up</HelpA>.
      </HelpP>

      <HelpH2>How do I search?</HelpH2>
      <HelpP>
        The magnifying glass in the nav. It searches what you&rsquo;re looking at — Feed, Discover, Songs, Moments, Artists, Library, Hub.
      </HelpP>

      <HelpH2>How do I post a lyric?</HelpH2>
      <HelpP>
        Compose (the gold tab). Search a Margo song, pick the line, send.
      </HelpP>

      <HelpH2>How do I upload music?</HelpH2>
      <HelpP>
        Apply as an artist, then use Studio. <HelpA href="/help/artist">Artist help</HelpA>.
      </HelpP>

      <HelpH2>How do I share a Moment?</HelpH2>
      <HelpP>
        Open a post or lyric, export a card or video. Vertical is built for YouTube Shorts quality.
      </HelpP>
    </HelpDoc>
  )
}
