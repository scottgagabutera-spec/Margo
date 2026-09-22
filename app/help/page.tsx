'use client'

import { HelpA, HelpDoc, HelpH2, HelpP } from '@/components/help-doc'

export default function HelpPage() {
  return (
    <HelpDoc kicker="Help" title="Help">
      <HelpP>
        Short answers for getting in and using Margo. Pick a topic.
      </HelpP>
      <HelpH2><HelpA href="/help/account">Sign in &amp; sign up</HelpA></HelpH2>
      <HelpP>Create an account, sign in, and if something blocks you.</HelpP>
      <HelpH2><HelpA href="/help/artist">Artists</HelpA></HelpH2>
      <HelpP>Apply, Studio, and uploading a song.</HelpP>
      <HelpH2><HelpA href="/faq">FAQ</HelpA></HelpH2>
      <HelpP>Feed, Discover, search, and sharing.</HelpP>
    </HelpDoc>
  )
}
