'use client'

import { HelpA, HelpDoc, HelpH2, HelpP } from '@/components/help-doc'

export default function HelpAccountPage() {
  return (
    <HelpDoc kicker="Help" title="Sign in & sign up">
      <HelpH2>Create an account</HelpH2>
      <HelpP>
        Open <HelpA href="/signin?mode=signup">Create account</HelpA>. Accept Terms and Privacy, then continue with Google, Discord, or email.
      </HelpP>
      <HelpP>
        Email needs a password. Google and Discord use the account you already have.
      </HelpP>

      <HelpH2>Sign in</HelpH2>
      <HelpP>
        <HelpA href="/signin">Sign in</HelpA> with the same method you used to join.
      </HelpP>

      <HelpH2>If it doesn&rsquo;t go through</HelpH2>
      <HelpP>Accept Terms and Privacy before continuing — the checkbox has to be on.</HelpP>
      <HelpP>Try the other method (Google / Discord / email) if one fails.</HelpP>
      <HelpP>
        Still stuck? <HelpA href="/contact">Contact</HelpA>.
      </HelpP>
    </HelpDoc>
  )
}
