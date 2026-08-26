'use client'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'

const FOOTER_LINKS = ['about', 'privacy', 'terms', 'dmca', 'contact'] as const

export default function DmcaPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 16px) 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <BackButton fallbackHref="/" />
          </div>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Copyright Policy</div>

          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Copyright<br />and the DMCA.
          </h1>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '32px' }}>Last updated: August 2026</div>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>

            <p style={{ marginBottom: '1.4em' }}>
              Margo respects the intellectual property rights of others and expects users to do the same. If you believe material available through Margo infringes your copyright, you may submit a notice as described below. In accordance with the Digital Millennium Copyright Act of 1998 (&quot;DMCA&quot;), Margo responds to properly submitted claims of alleged copyright infringement in accordance with applicable law.
            </p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Our Designated Agent</h2>
            <p style={{ marginBottom: '1.4em' }}>
              Margo has designated an agent to receive notifications of claimed copyright infringement, registered with the U.S. Copyright Office under Registration Number DMCA-1077694.
            </p>
            <p style={{ marginBottom: '1.4em' }}>
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Designated Agent:</strong> Margo<br />
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Email:</strong>{' '}
              <a href="mailto:dmca@trymargo.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>dmca@trymargo.com</a>
            </p>
            <p style={{ marginBottom: '1.4em' }}>
              Full designation details, including registered contact information, are on file and publicly searchable in the U.S. Copyright Office&apos;s DMCA Designated Agent Directory at{' '}
              <a href="https://dmca.copyright.gov" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>dmca.copyright.gov</a>.
            </p>
            <p style={{ marginBottom: '1.4em' }}>
              Please direct all DMCA takedown notices to the email address above. Notices sent to any other address may result in delayed processing.
            </p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Filing a DMCA Takedown Notice</h2>
            <p style={{ marginBottom: '1.4em' }}>
              If you believe that content available on Margo infringes your copyright, you (or your authorized agent) may submit a written notification to our Copyright Agent. To be effective, your notice must include substantially the following, per 17 U.S.C. § 512(c)(3):
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '1.4em' }}>
              <li style={{ marginBottom: '0.5em' }}>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf.</li>
              <li style={{ marginBottom: '0.5em' }}>Identification of the copyrighted work claimed to have been infringed (or, if multiple works are covered by a single notification, a representative list of such works).</li>
              <li style={{ marginBottom: '0.5em' }}>Identification of the material claimed to be infringing, and information reasonably sufficient to allow Margo to locate it — for example, a direct link to the post, lyric, or profile.</li>
              <li style={{ marginBottom: '0.5em' }}>Your contact information, including your address, telephone number, and email address.</li>
              <li style={{ marginBottom: '0.5em' }}>A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
              <li style={{ marginBottom: '0.5em' }}>A statement, made under penalty of perjury, that the information in the notification is accurate and that you are the copyright owner or authorized to act on the copyright owner&apos;s behalf.</li>
            </ul>
            <p style={{ marginBottom: '1.4em' }}>
              Notices that do not substantially comply with these requirements may not receive a response.
            </p>
            <p style={{ marginBottom: '1.4em' }}>
              Please note: Under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing may be liable for damages. Please consider whether use of the material may be protected by fair use before submitting a notice.
            </p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>What Happens After a Valid Notice</h2>
            <p style={{ marginBottom: '1.4em' }}>
              Upon receipt of a valid takedown notice, Margo may remove or disable access to the identified material and notify the user who posted it, as appropriate.
            </p>
            <p style={{ marginBottom: '1.4em' }}>
              Margo reserves the right to remove or disable access to material alleged to be infringing at its discretion, and to suspend or terminate accounts in appropriate circumstances.
            </p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Counter-Notification</h2>
            <p style={{ marginBottom: '1.4em' }}>
              If material you posted was removed as a result of a DMCA notice, and you believe the material was removed in error or as a result of misidentification, you may submit a counter-notification to our Copyright Agent. To be effective, your counter-notification must include:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '1.4em' }}>
              <li style={{ marginBottom: '0.5em' }}>Your physical or electronic signature.</li>
              <li style={{ marginBottom: '0.5em' }}>Identification of the material that was removed, and its location before removal.</li>
              <li style={{ marginBottom: '0.5em' }}>A statement, under penalty of perjury, that you have a good-faith belief the material was removed as a result of mistake or misidentification.</li>
              <li style={{ marginBottom: '0.5em' }}>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal court in your district (or, if outside the U.S., an appropriate judicial district), and that you will accept service of process from the person who submitted the original notice.</li>
            </ul>
            <p style={{ marginBottom: '1.4em' }}>
              If we receive a valid counter-notification, we may restore the material no fewer than 10 and no more than 14 business days later, unless we receive notice that the original claimant has filed a court action seeking to restrain the allegedly infringing activity.
            </p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Repeat Infringer Policy</h2>
            <p style={{ marginBottom: '1.4em' }}>
              In appropriate circumstances, Margo may suspend or terminate the accounts of users who repeatedly infringe the copyrights or other intellectual property rights of others.
            </p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Contact</h2>
            <p style={{ marginBottom: '1.4em' }}>
              For all copyright-related inquiries, notices, and counter-notices:{' '}
              <a href="mailto:dmca@trymargo.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>dmca@trymargo.com</a>
            </p>
            <p style={{ marginBottom: '1.4em' }}>
              This policy was last updated August 2026.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            {FOOTER_LINKS.map(p => (
              <Link key={p} href={`/${p}`} style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', textDecoration: 'none' }}>{p}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
