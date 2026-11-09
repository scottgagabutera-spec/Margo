'use client'
import Link from 'next/link'
import { InfoPageShell } from '@/components/info/info-page-shell'

export default function DmcaPage() {
  return (
    <InfoPageShell title="Copyright and DMCA" subtitle="Last updated: August 2026">
      <p>Copyright</p>
      <p>and the DMCA.</p>
      <p>
                          Margo respects the intellectual property rights of others and expects users to do the same. If you believe material available through Margo infringes your copyright, you may submit a notice as described below. In accordance with the Digital Millennium Copyright Act of 1998 (&quot;DMCA&quot;), Margo responds to properly submitted claims of alleged copyright infringement in accordance with applicable law.
                        </p>
            
                        <h2 className="margo-content-page__section-title">Our Designated Agent</h2>
                        <p>
                          Margo has designated an agent to receive notifications of claimed copyright infringement, registered with the U.S. Copyright Office under Registration Number DMCA-1077694.
                        </p>
                        <p>
                          <strong>Designated Agent:</strong> Margo<br />
                          <strong>Email:</strong>{' '}
                          <a href="mailto:dmca@trymargo.com" className="margo-info-link">dmca@trymargo.com</a>
                        </p>
                        <p>
                          Full designation details, including registered contact information, are on file and publicly searchable in the U.S. Copyright Office&apos;s DMCA Designated Agent Directory at{' '}
                          <a href="https://dmca.copyright.gov" target="_blank" rel="noopener noreferrer" className="margo-info-link">dmca.copyright.gov</a>.
                        </p>
                        <p>
                          Please direct all DMCA takedown notices to the email address above. Notices sent to any other address may result in delayed processing.
                        </p>
            
                        <h2 className="margo-content-page__section-title">Filing a DMCA Takedown Notice</h2>
                        <p>
                          If you believe that content available on Margo infringes your copyright, you (or your authorized agent) may submit a written notification to our Copyright Agent. To be effective, your notice must include substantially the following, per 17 U.S.C. § 512(c)(3):
                        </p>
                        <ul>
                          <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf.</li>
                          <li>Identification of the copyrighted work claimed to have been infringed (or, if multiple works are covered by a single notification, a representative list of such works).</li>
                          <li>Identification of the material claimed to be infringing, and information reasonably sufficient to allow Margo to locate it — for example, a direct link to the post, lyric, or profile.</li>
                          <li>Your contact information, including your address, telephone number, and email address.</li>
                          <li>A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
                          <li>A statement, made under penalty of perjury, that the information in the notification is accurate and that you are the copyright owner or authorized to act on the copyright owner&apos;s behalf.</li>
                        </ul>
                        <p>
                          Notices that do not substantially comply with these requirements may not receive a response.
                        </p>
                        <p>
                          Please note: Under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing may be liable for damages. Please consider whether use of the material may be protected by fair use before submitting a notice.
                        </p>
            
                        <h2 className="margo-content-page__section-title">What Happens After a Valid Notice</h2>
                        <p>
                          Upon receipt of a valid takedown notice, Margo may remove or disable access to the identified material and notify the user who posted it, as appropriate.
                        </p>
                        <p>
                          Margo reserves the right to remove or disable access to material alleged to be infringing at its discretion, and to suspend or terminate accounts in appropriate circumstances.
                        </p>
            
                        <h2 className="margo-content-page__section-title">Counter-Notification</h2>
                        <p>
                          If material you posted was removed as a result of a DMCA notice, and you believe the material was removed in error or as a result of misidentification, you may submit a counter-notification to our Copyright Agent. To be effective, your counter-notification must include:
                        </p>
                        <ul>
                          <li>Your physical or electronic signature.</li>
                          <li>Identification of the material that was removed, and its location before removal.</li>
                          <li>A statement, under penalty of perjury, that you have a good-faith belief the material was removed as a result of mistake or misidentification.</li>
                          <li>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal court in your district (or, if outside the U.S., an appropriate judicial district), and that you will accept service of process from the person who submitted the original notice.</li>
                        </ul>
                        <p>
                          If we receive a valid counter-notification, we may restore the material no fewer than 10 and no more than 14 business days later, unless we receive notice that the original claimant has filed a court action seeking to restrain the allegedly infringing activity.
                        </p>
            
                        <h2 className="margo-content-page__section-title">Repeat Infringer Policy</h2>
                        <p>
                          In appropriate circumstances, Margo may suspend or terminate the accounts of users who repeatedly infringe the copyrights or other intellectual property rights of others.
                        </p>
            
                        <h2 className="margo-content-page__section-title">Contact</h2>
                        <p>
                          For all copyright-related inquiries, notices, and counter-notices:{' '}
                          <a href="mailto:dmca@trymargo.com" className="margo-info-link">dmca@trymargo.com</a>
                        </p>
      <p>
        This policy was last updated August 2026.
      </p>
    </InfoPageShell>
  )
}
