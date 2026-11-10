'use client'
import Link from 'next/link'
import { InfoPageShell } from '@/components/info/info-page-shell'

export default function DataDeletionPage() {
  return (
    <InfoPageShell title="Data deletion" subtitle="Last updated: September 2026">
      <p>Account &amp; data deletion.</p>
      <p>
                    This page explains how to request deletion of your personal account data on Margo.
                    It is <strong>not</strong> for copyright
                    complaints — those go to our{' '}
                    <Link href="/dmca" className="margo-info-link">Copyright / DMCA Policy</Link>.
                  </p>
      
                  <h2 className="margo-content-page__section-title">Delete your Margo account (recommended)</h2>
                  <p>
                    If you have a Margo account, the fastest way to delete your personal data is in the app:
                  </p>
                  <ol>
                    <li>Sign in at <Link href="https://trymargo.com/signin" className="margo-info-link">trymargo.com/signin</Link></li>
                    <li>Open <strong>Settings</strong></li>
                    <li>Scroll to <strong>Delete your account</strong></li>
                    <li>Confirm permanent deletion</li>
                  </ol>
                  <p>
                    Permanent deletion removes your profile, posts, messages, follow relationships, uploaded songs,
                    and associated engagement data from our active systems, as described in our{' '}
                    <Link href="/privacy" className="margo-info-link">Privacy Policy</Link>.
                    Login credentials are removed and cannot be recovered.
                  </p>
      
                  <h2 className="margo-content-page__section-title">Request deletion by email</h2>
                  <p>
                    If you cannot sign in, or you need help with a deletion request, email us from the address
                    associated with your account:
                  </p>
                  <p>
                    <strong>Privacy &amp; data deletion:</strong>{' '}
                    <a href="mailto:hello@trymargo.com?subject=Margo%20data%20deletion%20request" className="margo-info-link">hello@trymargo.com</a>
                    <br />
                    <strong>Account support:</strong>{' '}
                    <a href="mailto:support@trymargo.com?subject=Margo%20data%20deletion%20request" className="margo-info-link">support@trymargo.com</a>
                  </p>
                  <p>
                    Include the username or email on your account. We may ask you to verify identity before completing
                    the request. We aim to respond within 30 days.
                  </p>
      
                  <h2 className="margo-content-page__section-title">Facebook Login &amp; connected Pages</h2>
                  <p>
                    If you connected a Facebook Page for Auto-Promote, you can disconnect it anytime in{' '}
                    <strong>Settings → Connected accounts</strong>{' '}
                    without deleting your whole Margo account. Deleting your Margo account also removes stored
                    Facebook connection tokens from our database.
                  </p>
                  <p>
                    To revoke Margo&apos;s access on Facebook itself, open Facebook →{' '}
                    <strong>Settings &amp; privacy → Settings → Apps and websites</strong>,
                    find Margo, and remove it.
                  </p>
      
                  <h2 className="margo-content-page__section-title">What we may retain</h2>
                  <p>
                    We may retain limited information where required by law, to resolve disputes, enforce our agreements,
                    prevent abuse, or because copies remain temporarily in secure backups until overwritten in the ordinary
                    backup cycle. See Section 6 of our{' '}
                    <Link href="/privacy" className="margo-info-link">Privacy Policy</Link> for details.
                  </p>
      
                  <h2 className="margo-content-page__section-title">Contact</h2>
                  <ul>
                    <li>
                      <strong>Privacy / personal data:</strong>{' '}
                      <a href="mailto:hello@trymargo.com" className="margo-info-link">hello@trymargo.com</a>
                    </li>
                    <li>
                      <strong>Copyright / DMCA:</strong>{' '}
                      <a href="mailto:dmca@trymargo.com" className="margo-info-link">dmca@trymargo.com</a> ·{' '}
                      <Link href="/dmca" className="margo-info-link">DMCA Policy</Link>
                    </li>
                  </ul>
    </InfoPageShell>
  )
}
