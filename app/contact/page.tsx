'use client'

import { InfoPageShell } from '@/components/info/info-page-shell'
import { ContactInboxGrid, ContactInboxLink } from '@/components/info/contact-inbox-grid'

const categories = [
  {
    label: 'General',
    email: 'hello@trymargo.com',
    icon: 'general' as const,
    description: <>Questions, feedback, and anything that doesn&apos;t fit the categories below.</>,
  },
  {
    label: 'Account & Studio support',
    email: 'support@trymargo.com',
    icon: 'support' as const,
    description: <>Help with your account, posts, or Studio.</>,
  },
  {
    label: 'Privacy & personal data',
    email: 'hello@trymargo.com',
    icon: 'privacy' as const,
    description: (
      <>
        Requests about your personal data or how we handle it. See{' '}
        <ContactInboxLink href="/data-deletion">Account &amp; Data Deletion</ContactInboxLink> or our{' '}
        <ContactInboxLink href="/privacy">Privacy Policy</ContactInboxLink>.
      </>
    ),
  },
  {
    label: 'Copyright / DMCA',
    email: 'dmca@trymargo.com',
    icon: 'dmca' as const,
    description: (
      <>
        Copyright infringement notices and related legal claims. Send DMCA notices here &mdash; not to the general inbox. See{' '}
        <ContactInboxLink href="/dmca">Copyright / DMCA Policy</ContactInboxLink>.
      </>
    ),
  },
  {
    label: 'Investors',
    email: 'investors@trymargo.com',
    icon: 'investors' as const,
    wide: true,
    description: <>Investor inquiries.</>,
  },
]

export default function ContactPage() {
  return (
    <InfoPageShell title="Contact" subtitle="We reply in 24 to 48 hours.">
      <p>Reach the right inbox for what you need. We read everything.</p>
      <ContactInboxGrid inboxes={categories} />
    </InfoPageShell>
  )
}
