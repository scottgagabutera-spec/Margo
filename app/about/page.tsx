'use client'

import Link from 'next/link'
import { InfoPageShell } from '@/components/info/info-page-shell'

export default function AboutPage() {
  return (
    <InfoPageShell title="About Margo">
      <p>Music is the language.</p>
      <p>Margo is the space.</p>
      <p>People have always talked in lyrics. Shared them, saved them, sent them when plain words weren&apos;t enough.</p>
      <p>Margo is a music first social space built for that. A place where conversation starts with a line from a song.</p>

      <h2>Talk in lyrics</h2>
      <p>Find a line. Hear it. Send it. Pick a line that says how you feel, hear that part of the song, and send it to someone. If they want to reply, they send a line back. That is a Lyric Back. No comment box.</p>
      <p>When you find something worth keeping, export a card, copy the text, or share a link back to Margo.</p>

      <h2>A real social space</h2>
      <p>Margo is built around people, profiles, and connections. Anonymity isn&apos;t the product.</p>
      <p>Follow people you vibe with. Keep your account private if you want. Message when someone lets you. Choose your username and make your profile yours.</p>

      <h2>Listen here</h2>
      <p>Margo isn&apos;t only a place to talk about music.</p>
      <p>Discover and play music hosted on Margo. Browse tracks, open an artist, and listen in app when the music lives here.</p>

      <h2>Music on Margo</h2>
      <p>Music comes to Margo in a few ways.</p>
      <p><strong>Margo Originals</strong><br />Music we publish as our own.</p>
      <p><strong>Independent and approved artists</strong><br />Creators who apply, get approved, and share their music directly with the community through Studio, including AI-assisted artists who retain their commercial rights.</p>
      <p><strong>Redirect only</strong><br />Posts and moments that send you elsewhere to listen when we don&apos;t host the full track.</p>
      <p>Different paths, one place for music.</p>

      <h2>For artists</h2>
      <p>Margo is for the people making the music, too.</p>
      <p>Apply to become an artist. Once approved, use Studio to upload and manage your music on Margo.</p>
      <p>
        We&apos;re building a roster of independent artists alongside Margo&apos;s own releases. A place where creators can put their music in the same space where people are already talking about it. If this resonates,{' '}
        <Link href="/contact" className="margo-info-link">get in touch</Link>.
      </p>

      <p>
        Warm. Intimate. A little personal.<br />
        Like finding the exact line that says what you couldn&apos;t.<br />
        When words fail, drop a lyric.
      </p>
    </InfoPageShell>
  )
}
