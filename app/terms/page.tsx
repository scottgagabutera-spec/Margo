'use client'
import Link from 'next/link'

const font = 'var(--font-lora), serif'
const pStyle: React.CSSProperties = { marginBottom: '1.4em' }
const h2Style: React.CSSProperties = {
  fontFamily: font,
  fontSize: '1.15rem',
  fontWeight: 600,
  fontStyle: 'italic',
  color: 'var(--text)',
  margin: '2.4em 0 0.8em',
}
const ulStyle: React.CSSProperties = { paddingLeft: '20px', marginBottom: '1.4em' }
const olStyle: React.CSSProperties = { paddingLeft: '20px', marginBottom: '1.4em' }
const liStyle: React.CSSProperties = { marginBottom: '0.5em' }
const linkStyle: React.CSSProperties = { color: 'var(--gold)', textDecoration: 'none' }
const strongStyle: React.CSSProperties = { color: 'var(--text)', fontWeight: 600 }

export default function TermsPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '88px 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Terms of Use</div>

          <h1 style={{ fontFamily: font, fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Clear rules.<br />No surprises.
          </h1>
          <div style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '32px' }}>Effective: August 2026</div>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: font, fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>

            <p style={pStyle}>
              These Terms of Use (&quot;Terms&quot;) govern your access to and use of Margo (the website, apps, and related services at trymargo.com — together, &quot;Margo,&quot; &quot;we,&quot; &quot;us&quot;). By creating an account or using Margo, you agree to these Terms and to our <Link href="/privacy" style={linkStyle}>Privacy Policy</Link> and <Link href="/dmca" style={linkStyle}>Copyright / DMCA Policy</Link>. If you do not agree, do not use Margo.
            </p>

            <h2 style={h2Style}>1. What Margo is</h2>
            <p style={pStyle}>Margo is a music and lyric community. You can create an account, post lyric excerpts and related content, Resonate and Lyric Back, Replay others&apos; posts, follow people, message them (subject to their settings), export shareable lyric cards, discover and play music hosted in Margo, and — if approved as an artist — upload and manage your own tracks through Studio.</p>
            <p style={pStyle}>Margo hosts audio and artwork for many songs directly (including via our storage providers). Some experiences also link out to third-party platforms when a post or catalog entry is redirect-only or includes external links. We may use third-party services for hosting, authentication, analytics, content moderation and related AI processing, and song metadata search to help operate Margo. Those providers can change over time. How we collect and share information — including through service providers — is described in our <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>.</p>

            <h2 style={h2Style}>2. Eligibility and accounts</h2>
            <p style={pStyle}><strong style={strongStyle}>Age.</strong> You must be at least <strong style={strongStyle}>13 years old</strong> to use Margo. If you are under the age of majority where you live, you may use Margo only with a parent or guardian&apos;s consent where required by law. Margo is not directed at children, and we do not knowingly collect personal information from children in violation of applicable law.</p>
            <p style={pStyle}><strong style={strongStyle}>Accounts required.</strong> An account is required to post, message, or interact with content on Margo (including resonating, lyric-backing, replaying, following, reporting, and similar actions). You may browse some public content without signing in where we allow it.</p>
            <p style={pStyle}><strong style={strongStyle}>Sign-up.</strong> You may register with email and password or through supported third-party sign-in (OAuth) providers. You are responsible for your account credentials and for activity under your account. Keep your password confidential and notify us if you believe your account has been compromised.</p>
            <p style={pStyle}><strong style={strongStyle}>Usernames and profiles.</strong> When you create an account, Margo may suggest a username. You choose and may change your username subject to availability and our rules (for example length and allowed characters). Usernames are not sold as a guarantee of uniqueness forever, exclusivity, or identity verification. Do not impersonate others or use a username that infringes rights or violates these Terms.</p>
            <p style={pStyle}><strong style={strongStyle}>Account settings.</strong> You may adjust settings such as private account, who can message you, and related preferences. Deactivating your account hides it in a reversible way from Settings; permanently deleting your account removes your data from our active systems as described in the Privacy Policy (subject to limited legal, security, or backup retention).</p>
            <p style={pStyle}>We may refuse, suspend, or terminate accounts that violate these Terms or that we reasonably believe pose legal, safety, or abuse risk.</p>

            <h2 style={h2Style}>3. Your content</h2>
            <p style={pStyle}><strong style={strongStyle}>What you can post.</strong> Subject to these Terms, you may post lyric excerpts, Lyric Backs, Replays, profile information, messages, and other content you submit (&quot;Your Content&quot;). You are solely responsible for Your Content and for having the rights and permissions needed to post it.</p>
            <p style={pStyle}><strong style={strongStyle}>License to Margo.</strong> You retain ownership of Your Content. You grant Margo a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, distribute, and otherwise use Your Content as needed to operate, improve, promote, and protect the service (including generating share formats such as lyric cards and delivering content to people who are allowed to see it under your settings). This license does <strong style={strongStyle}>not</strong> include the right to use Your Content to train artificial intelligence or machine learning models. This license ends when Your Content is deleted from our active systems, except for reasonable technical remnants (caches, backups) and content that others have lawfully shared or that we must retain for legal reasons.</p>
            <p style={pStyle}><strong style={strongStyle}>Lyrics and copyright.</strong> Short lyric excerpts may be shared as part of how people talk about music, but rights still belong to the rightsholders. Do not paste full songs, albums, or other copyrighted material you do not have rights to use. Margo may remove content that appears to infringe copyright or that we are required to remove. Copyright complaints are handled under our DMCA process (Section 9).</p>
            <p style={pStyle}><strong style={strongStyle}>Prohibited content and conduct.</strong> You agree not to:</p>
            <ul style={ulStyle}>
              <li style={liStyle}>Post unlawful, harassing, hateful, threatening, pornographic (where prohibited), or otherwise abusive content</li>
              <li style={liStyle}>Spam, scam, or manipulate engagement</li>
              <li style={liStyle}>Impersonate people, artists, or brands</li>
              <li style={liStyle}>Infringe copyright, trademark, privacy, or other rights</li>
              <li style={liStyle}>Attempt to access others&apos; accounts or non-public areas of the service, scrape at abusive scale, or interfere with Margo&apos;s operation</li>
              <li style={liStyle}>Use Margo to distribute malware or to violate applicable law</li>
            </ul>
            <p style={pStyle}>We may remove or limit distribution of content, and may warn, freeze, or remove accounts or artist access, when we believe these Terms or the law require it — including through automated tools (for example moderation and tagging systems described in the Privacy Policy) and human review.</p>

            <h2 style={h2Style}>4. Music on Margo (rights model)</h2>
            <p style={pStyle}>Music on Margo falls into three practical categories. Labels in the product may evolve; this describes the rights model, not every UI badge.</p>
            <p style={pStyle}><strong style={strongStyle}>a) Margo Originals</strong><br />Tracks we publish as Margo&apos;s own catalog. We (or our licensors) own or control the rights needed to host and make those tracks available on Margo.</p>
            <p style={pStyle}><strong style={strongStyle}>b) Independent / approved artists</strong><br />Artists who apply and are approved (including independents who complete our verification flow, which may include verification against a third-party AI music profile) may upload and host audio and artwork in Studio.</p>
            <ul style={ulStyle}>
              <li style={liStyle}>Approved artists represent that they own or control the rights needed to upload and commercialize that music on Margo, and that their uploads do not infringe others&apos; rights.</li>
              <li style={liStyle}>For artist-uploaded works — including AI-generated or AI-assisted tracks created with third-party AI music tools when the artist holds commercial rights — <strong style={strongStyle}>the artist retains their commercial rights</strong> in their music, except for the license they grant us below.</li>
              <li style={liStyle}>Artists grant Margo a worldwide, non-exclusive, royalty-free license to host, stream, display, promote, and otherwise make their uploaded music and related metadata/artwork available on Margo and in Margo marketing that features the platform.</li>
              <li style={liStyle}>We may moderate artist accounts and catalogs (including warn, freeze uploads/visibility, hide tracks, or remove artist status) for Terms violations, rights issues, safety, or quality/abuse concerns.</li>
            </ul>
            <p style={pStyle}><strong style={strongStyle}>c) Redirect-only content</strong><br />Some posts or references point users to listen elsewhere (for example via outbound links to third-party platforms) without hosting full audio on Margo. We do not claim ownership of those third-party recordings by linking to them. Availability and terms of those platforms are controlled by those third parties.</p>
            <p style={pStyle}><strong style={strongStyle}>Streaming links and metadata.</strong> When we show links or metadata from third parties, those materials remain subject to the third party&apos;s terms and rights. Metadata may be incomplete or wrong; do not treat it as legal clearance to use a work.</p>
            <p style={pStyle}><strong style={strongStyle}>No payment processing (for now).</strong> Margo does not currently process payments for listening or posting. Any future paid features would be described separately before they apply.</p>

            <h2 style={h2Style}>5. Artist applications, Studio, and warranties</h2>
            <p style={pStyle}>Applying to become an artist (independent or label) is optional. Submitting an application does not guarantee approval.</p>
            <p style={pStyle}><strong style={strongStyle}>Application.</strong> You may need to provide information such as display name, social or platform links, and other details we request. We may fetch public profile pages you point us to as part of verification (see Privacy Policy).</p>
            <p style={pStyle}><strong style={strongStyle}>Rights warranty.</strong> By applying — and each time you upload or publish music through Studio after approval — you represent and warrant that:</p>
            <ol style={olStyle}>
              <li style={liStyle}>You own or have all necessary rights, licenses, and permissions to upload and make the content available on Margo;</li>
              <li style={liStyle}>Your content does not infringe copyright, trademark, privacy, publicity, or other rights;</li>
              <li style={liStyle}>If the work is AI-generated or AI-assisted (including via third-party AI music tools), you have the commercial rights required by that tool&apos;s terms and by law to use and distribute it as you do on Margo; and</li>
              <li style={liStyle}>You agree to these Terms and our Copyright / DMCA Policy.</li>
            </ol>
            <p style={pStyle}>We may reject applications, revoke approval, hide or remove uploads, and cooperate with rightsholders when we believe these warranties are breached.</p>
            <p style={pStyle}><strong style={strongStyle}>Studio.</strong> Only approved artists with eligible account status may upload. Suspended, frozen, or removed artists may lose upload and/or public catalog access. You are responsible for the accuracy of titles, credits, artwork, and other metadata you provide.</p>

            <h2 style={h2Style}>6. Messaging</h2>
            <p style={pStyle}>Messaging is available between accounts according to each recipient&apos;s settings (for example everyone, followers only, or no one). Private accounts and follow acceptance may further limit who can see content or message. Do not use messaging to harass, spam, scam, or share unlawful content.</p>
            <p style={pStyle}>We may access, preserve, or disclose messages when required by law, to enforce these Terms, or to protect Margo, our users, or the public, as described in the Privacy Policy. If someone is bothering you, use in-product controls (block/follow/message settings where available) and <strong style={strongStyle}>report posts</strong> that violate these Terms. (Direct-message-specific report tooling may not be available for every surface; you may also contact us using the addresses in Section 16.)</p>

            <h2 style={h2Style}>7. Reporting, moderation, and enforcement</h2>
            <p style={pStyle}>You may report posts that appear to violate these Terms (for example spam, harassment, or inappropriate content). Reports are reviewed through our admin tools; outcomes may include no action, content hiding/removal, account warnings, artist freezes or removals, or other steps we consider appropriate.</p>
            <p style={pStyle}>We may also act without a user report — including automated moderation flags and human review — to hide content, limit features, or suspend or terminate accounts.</p>
            <p style={pStyle}>Content owners may have in-product controls (for example editing or managing their posts). Removal by you or by us does not eliminate copies that others have already saved, exported, or reshared outside Margo.</p>

            <h2 style={h2Style}>8. Card exports and sharing</h2>
            <p style={pStyle}>You may export or share lyric cards and links featuring content you are allowed to see. Exported cards may include Margo branding. Sharing does not transfer ownership of underlying music rights. Card export may be logged for signed-in users as described in the Privacy Policy (for product analytics), without blocking your download if logging fails.</p>

            <h2 style={h2Style}>9. Copyright and DMCA</h2>
            <p style={pStyle}>If you believe content on Margo infringes your copyright, send a notice to our designated agent as described in our <Link href="/dmca" style={linkStyle}>Copyright / DMCA Policy</Link>:</p>
            <p style={pStyle}><strong style={strongStyle}>Email: <a href="mailto:dmca@trymargo.com" style={linkStyle}>dmca@trymargo.com</a></strong><br /><strong style={strongStyle}>Policy: <Link href="/dmca" style={linkStyle}>/dmca</Link></strong></p>
            <p style={pStyle}>Do not send DMCA notices only to general inboxes; notices sent elsewhere may be delayed. We may remove or disable access to material, notify the poster, and suspend or terminate repeat infringers as described in that policy, including counter-notice procedures.</p>
            <p style={pStyle}>For non-copyright legal concerns, see Section 16.</p>

            <h2 style={h2Style}>10. Third-party services</h2>
            <p style={pStyle}>Margo uses and may link to third-party services for things such as hosting, authentication, analytics, AI-assisted moderation and processing, metadata search, and outbound listening or profile platforms. Those services are governed by their own terms and privacy policies. We are not responsible for third-party sites or services we don&apos;t control.</p>
            <p style={pStyle}>Those providers can change over time. How we collect and share information — including through service providers — is described in our <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>.</p>

            <h2 style={h2Style}>11. Changes</h2>
            <p style={pStyle}>We may update these Terms from time to time. We will post the updated Terms with a new effective date. Continued use after changes become effective constitutes acceptance. If you do not agree, stop using Margo and delete your account if you wish.</p>

            <h2 style={h2Style}>12. Disclaimers and limitation of liability</h2>
            <p style={pStyle}><strong style={strongStyle}>Service &quot;as is&quot;.</strong> Margo is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not warrant uninterrupted or error-free operation, perfect metadata, unbroken third-party links, or that every piece of content is non-infringing. Music availability may change as rights, artist status, or moderation outcomes change.</p>
            <p style={pStyle}><strong style={strongStyle}>Limitation of liability.</strong> To the maximum extent permitted by law, Margo and its operators will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, goodwill, or other intangible losses, arising from your use of Margo or these Terms. Our aggregate liability for claims relating to Margo will not exceed the amount you paid us, if any, in the twelve months before the claim arose. Some jurisdictions do not allow limitations on liability; in those cases, our liability is limited to the fullest extent permitted by law.</p>

            <h2 style={h2Style}>13. Indemnification</h2>
            <p style={pStyle}>You agree to defend, indemnify, and hold harmless Margo and its operators, affiliates, officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) Your Content; (b) your use of Margo; (c) your violation of these Terms or applicable law; or (d) your infringement or misappropriation of any third party&apos;s rights. We may, at our expense, assume the exclusive defense and control of any matter subject to indemnification by you, in which case you agree to cooperate with our defense.</p>

            <h2 style={h2Style}>14. Termination</h2>
            <p style={pStyle}>If your account is suspended or terminated by us, or if you permanently delete your account:</p>
            <ul style={ulStyle}>
              <li style={liStyle}>Your right to access and use Margo ends immediately (except for any limited access we expressly leave available, such as reading these Terms or contacting us).</li>
              <li style={liStyle}>Content and data handling follows the deactivate vs. delete distinction in Section 2 and the Privacy Policy: deactivation is a reversible private/hidden state; permanent deletion removes your data from our active systems, subject to limited legal, security, backup, or dispute-related retention.</li>
              <li style={liStyle}>Content you posted may already have been seen, shared, exported, or cached by others; termination does not require us to retrieve those third-party copies.</li>
              <li style={liStyle}>Licenses you granted us end for ongoing hosting and display of deleted Your Content as described in Section 3, except where retention or prior lawful sharing still applies.</li>
              <li style={liStyle}>Artist Studio access, uploads, and public catalog visibility may be revoked or limited immediately upon suspension, freeze, removal, or termination.</li>
            </ul>
            <p style={pStyle}>Suspension may be temporary or lead to permanent termination at our discretion where these Terms or the law allow.</p>

            <h2 style={h2Style}>15. General provisions</h2>
            <p style={pStyle}><strong style={strongStyle}>Severability.</strong> If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision will be enforced to the maximum extent permissible, and the remaining provisions will continue in full force and effect.</p>
            <p style={pStyle}><strong style={strongStyle}>Survival.</strong> The following survive account suspension or termination, and survive updates to these Terms to the extent they applied to your prior use: Sections 3 (to the extent licenses, ownership, and residual copies remain relevant), 9 (Copyright and DMCA), 12 (Disclaimers and limitation of liability), 13 (Indemnification), 14 (Termination), 15 (General provisions, including governing law and dispute resolution), and 16 (Contact), together with any other provisions that by their nature should survive.</p>
            <p style={pStyle}><strong style={strongStyle}>Governing law and disputes.</strong> These Terms are governed by the laws of the jurisdiction in which Margo&apos;s operating entity is organized, without regard to conflict-of-law principles. Any disputes arising from these Terms or your use of Margo will be resolved in the courts located in that jurisdiction, unless applicable law requires otherwise.</p>

            <h2 style={h2Style}>16. Contact</h2>
            <ul style={ulStyle}>
              <li style={liStyle}><strong style={strongStyle}>General questions:</strong> <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a></li>
              <li style={liStyle}><strong style={strongStyle}>Privacy / personal data requests:</strong> <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a> (see <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>)</li>
              <li style={liStyle}><strong style={strongStyle}>Copyright / DMCA:</strong> <a href="mailto:dmca@trymargo.com" style={linkStyle}>dmca@trymargo.com</a> · <Link href="/dmca" style={linkStyle}>Copyright / DMCA Policy</Link></li>
            </ul>

          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            {['about', 'privacy', 'terms', 'dmca', 'contact'].map(p => (
              <Link key={p} href={`/${p}`} style={{ fontFamily: font, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', textDecoration: 'none' }}>{p}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
