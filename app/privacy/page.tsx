'use client'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'

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
const liStyle: React.CSSProperties = { marginBottom: '0.5em' }
const linkStyle: React.CSSProperties = { color: 'var(--gold)', textDecoration: 'none' }
const strongStyle: React.CSSProperties = { color: 'var(--text)', fontWeight: 600 }

export default function PrivacyPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '88px 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <BackButton fallbackHref="/" />
          </div>
          <div style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Privacy Policy</div>

          <h1 style={{ fontFamily: font, fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Your data.<br />Kept simple.
          </h1>
          <div style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '32px' }}>Last updated: August 2026</div>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: font, fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>

            <p style={pStyle}>
              Margo (&quot;we,&quot; &quot;us,&quot; &quot;Margo&quot;) operates trymargo.com and related apps and services (together, &quot;Margo&quot;). This Privacy Policy explains how we collect, use, disclose, and protect personal information when you use Margo.
            </p>
            <p style={pStyle}>
              By using Margo, you also agree to our <Link href="/terms" style={linkStyle}>Terms of Use</Link> and <Link href="/dmca" style={linkStyle}>Copyright / DMCA Policy</Link>. If you do not agree, do not use Margo.
            </p>

            <h2 style={h2Style}>1. Information we collect</h2>
            <p style={pStyle}>We collect information in the categories below. Exact fields and systems may change as Margo evolves; this describes the kinds of information involved, not an inventory of databases or columns.</p>
            <p style={pStyle}><strong style={strongStyle}>Account information.</strong> When you create an account, we collect information needed to register and sign you in — typically an email address and authentication credentials, or basic account details shared by a third-party sign-in provider you choose (such as a name or profile photo those providers make available). An account is required to post, message, or interact with content on Margo.</p>
            <p style={pStyle}><strong style={strongStyle}>Profile information.</strong> Information you add to your profile, such as username, display name, avatar, bio, signature lyric, and privacy or messaging preferences.</p>
            <p style={pStyle}><strong style={strongStyle}>Content you create.</strong> Lyric posts, Lyric Backs, Replays, comments, quotes, reports, and other content you submit.</p>
            <p style={pStyle}><strong style={strongStyle}>Messages.</strong> Direct messages you send to other users, subject to each person&apos;s messaging settings.</p>
            <p style={pStyle}><strong style={strongStyle}>Artist and application information.</strong> If you apply to become an artist or upload music after approval, we collect application details you provide (for example display name and links you submit for verification), plus audio, artwork, credits, and related metadata you upload through Studio.</p>
            <p style={pStyle}><strong style={strongStyle}>Usage and engagement data.</strong> How you use Margo — for example what you view, Resonate with, Replay, follow, report, export as a card, or play — used to operate features (counts, feeds, recommendations) and understand how the product is used. Card exports by signed-in users may be logged for product analytics and do not block the export if logging fails.</p>
            <p style={pStyle}><strong style={strongStyle}>Device, log, and technical data.</strong> Technical information such as browser or app type, language or region settings, IP address, timestamps, and similar logs generated when you access Margo. We may also use local identifiers on your device to keep the product working (for example to keep you signed in or to avoid double-counting views or plays).</p>
            <p style={pStyle}><strong style={strongStyle}>Information from others.</strong> Other users may mention you, message you, report content, or interact with your posts. Artist verification may also involve fetching public pages or profiles you point us to.</p>
            <p style={pStyle}>We do not currently collect payment card information — Margo does not process payments for listening or posting. If that changes, we will update this policy and describe those practices before they apply.</p>
            <p style={pStyle}>We do not sell or rent your personal information, and we do not use advertising trackers to follow you across other websites.</p>

            <h2 style={h2Style}>2. How we use information</h2>
            <p style={pStyle}>We use the information above to:</p>
            <ul style={ulStyle}>
              <li style={liStyle}>Operate, maintain, and secure your account and Margo&apos;s core features (including posting, Resonate, Lyric Back, Replay, messaging, follows, card export, listening, and Studio where applicable)</li>
              <li style={liStyle}>Personalize feeds, recommendations, and related product experiences</li>
              <li style={liStyle}>Analyze emotional tone or similar signals in lyric text you compose or interact with, to power features such as vibe tagging and personalization</li>
              <li style={liStyle}>Moderate content and enforce our Terms — including with AI-assisted tools and human review</li>
              <li style={liStyle}>Transcribe or time-align artist-uploaded audio when needed for lyric-sync and related Studio features</li>
              <li style={liStyle}>Respond to support requests, reports, and copyright notices</li>
              <li style={liStyle}>Improve reliability, safety, and product quality</li>
              <li style={liStyle}>Comply with law and protect Margo, our users, and the public</li>
            </ul>
            <p style={pStyle}>We process personal information to provide the service, meet legal obligations, protect legitimate interests such as preventing abuse and improving the platform, and — where required — based on your consent.</p>
            <p style={pStyle}><strong style={strongStyle}>AI tools.</strong> We may use AI-assisted tools for content moderation, tagging, transcription, and similar product features. We do not use your content to train artificial intelligence or machine learning models. Processors change over time; what matters for this policy is the purpose (operating and protecting Margo), not the brand name of any particular provider.</p>

            <h2 style={h2Style}>3. How we share information</h2>
            <p style={pStyle}>We share information only as needed to run Margo and as described here.</p>
            <p style={pStyle}><strong style={strongStyle}>Service providers.</strong> We use cloud hosting, database, storage, authentication, analytics, email or communications, AI-assisted processing, and similar infrastructure and service providers to operate Margo. They process information on our behalf under arrangements appropriate to that role. The specific providers we use can change over time as we build and maintain the product.</p>
            <p style={pStyle}><strong style={strongStyle}>Sign-in providers you choose.</strong> If you sign in through a third-party provider, that provider processes your login under its own policies. We receive only the account information needed to create or connect your Margo account.</p>
            <p style={pStyle}><strong style={strongStyle}>Public song metadata.</strong> When you search for or attach a song to a post, we may query public song and music metadata services for titles, artists, artwork, and similar information. We do not send your personal account credentials as part of those lookups. Some posts may also display metadata or thumbnails previously retrieved and stored for that purpose.</p>
            <p style={pStyle}><strong style={strongStyle}>Other users and the public.</strong> Content and profile information you choose to make available is visible according to your settings and the nature of the feature (see Section 4).</p>
            <p style={pStyle}><strong style={strongStyle}>Legal and safety.</strong> We may access, preserve, and disclose information — including messages — if we believe in good faith that it is reasonably necessary to comply with law, legal process, or governmental request; enforce our Terms; or protect the rights, property, or safety of Margo, our users, or the public.</p>
            <p style={pStyle}><strong style={strongStyle}>Business transfers.</strong> If Margo is involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred as part of that transaction, subject to appropriate protections.</p>
            <p style={pStyle}>We are not responsible for third-party sites or services we do not control. When you leave Margo or use an integrated third-party feature, their privacy practices apply.</p>

            <h2 style={h2Style}>4. Public content and shared media</h2>
            <p style={pStyle}>Some information on Margo is public by design:</p>
            <ul style={ulStyle}>
              <li style={liStyle}>Posts, Lyric Backs, Replays, and similar content you share publicly are visible to other users — or more broadly if your account is not private</li>
              <li style={liStyle}>Profile information you publish (such as username, avatar, and bio) is visible according to your account settings</li>
              <li style={liStyle}>Artist-uploaded audio, artwork, and certain media files, as well as profile avatars, may be delivered through publicly reachable URLs so they can load efficiently. Anyone with a direct link may be able to access those files, even without a Margo account</li>
            </ul>
            <p style={pStyle}>If your account is private, your posts and profile are limited to accepted followers, subject to the features described in our Terms. Removal or privacy changes on Margo does not retrieve copies that others have already saved, exported, or reshared outside Margo.</p>

            <h2 style={h2Style}>5. Cookies and similar technologies</h2>
            <p style={pStyle}>Margo uses cookies, local storage, and similar technologies so the product can function — including keeping you signed in, remembering preferences, supporting basic interface state, and helping us measure usage in aggregate.</p>
            <p style={pStyle}>We do <strong style={strongStyle}>not</strong> use third-party advertising cookies or cross-site tracking cookies to follow you around the web.</p>
            <p style={pStyle}>You can control cookies through your browser settings. Blocking some cookies may affect sign-in or other features. Local storage and similar on-device data can usually be cleared through your browser or device settings.</p>
            <p style={pStyle}>We may use privacy-oriented analytics to understand aggregate how Margo is used. Those tools are not used to advertise to you across other sites.</p>

            <h2 style={h2Style}>6. Retention, deactivation, and deletion</h2>
            <p style={pStyle}>We keep personal information only as long as needed to provide Margo, comply with law, resolve disputes, enforce our agreements, and protect against abuse — then delete or de-identify it according to our practices.</p>
            <p style={pStyle}><strong style={strongStyle}>Deactivate.</strong> From Settings, you can deactivate your account. Deactivation is a reversible, private/hidden state: your account is not permanently erased, and you may be able to restore access later as the product allows.</p>
            <p style={pStyle}><strong style={strongStyle}>Delete.</strong> When you permanently delete your account, we delete your profile, posts, messages, follow relationships, uploaded songs and files, and associated engagement data tied to your account from our <strong style={strongStyle}>active systems</strong>, subject to limited retention described below. Login credentials associated with that account are removed and cannot be recovered.</p>
            <p style={pStyle}><strong style={strongStyle}>Limited retention after deletion.</strong> We may retain certain information where required by law, to resolve disputes, enforce our agreements, prevent abuse or fraud, or because copies remain temporarily in secure backups until those backups are overwritten in the ordinary backup cycle. Content you posted may already have been seen, shared, exported, or cached by others; deletion on Margo does not require us to retrieve those third-party copies.</p>

            <h2 style={h2Style}>7. Your rights and choices</h2>
            <p style={pStyle}>Depending on where you live and applicable law, you may have rights to access, correct, delete, or obtain a copy of your personal information; to object to or restrict certain processing; or to withdraw consent where processing is based on consent.</p>
            <p style={pStyle}>To exercise these rights, or if you have questions about your data, contact <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a>. We may need to verify your identity before completing certain requests. If your request concerns copyrighted material on Margo, use the DMCA process instead (see Section 12).</p>
            <p style={pStyle}>You can update most account and profile information — including username, bio, avatar, and privacy or messaging settings — directly in Settings at any time.</p>

            <h2 style={h2Style}>8. Security</h2>
            <p style={pStyle}>We use reasonable administrative, technical, and organizational measures designed to protect personal information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>

            <h2 style={h2Style}>9. International transfers</h2>
            <p style={pStyle}>Margo is operated using infrastructure and service providers that may process information in countries other than where you live. Where required by law, we take appropriate safeguards for those transfers.</p>

            <h2 style={h2Style}>10. Children&apos;s privacy</h2>
            <p style={pStyle}>You must be at least <strong style={strongStyle}>13 years old</strong> to use Margo. Margo is not directed at children, and we do not knowingly collect personal information from children in violation of applicable law. If you believe a child under 13 (or under the age required in their jurisdiction) has provided us with personal information, contact <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a> and we will take appropriate action.</p>

            <h2 style={h2Style}>11. Third-party links</h2>
            <p style={pStyle}>Margo may link to third-party websites or services (including outbound listening links and pages you submit for artist verification). We are not responsible for their privacy practices. Review their policies before you provide them information.</p>

            <h2 style={h2Style}>12. Contact</h2>
            <ul style={ulStyle}>
              <li style={liStyle}><strong style={strongStyle}>Privacy / personal data requests:</strong> <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a></li>
              <li style={liStyle}><strong style={strongStyle}>General questions:</strong> <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a></li>
              <li style={liStyle}><strong style={strongStyle}>Copyright / DMCA:</strong> <a href="mailto:dmca@trymargo.com" style={linkStyle}>dmca@trymargo.com</a> · <Link href="/dmca" style={linkStyle}>Copyright / DMCA Policy</Link></li>
            </ul>

            <h2 style={h2Style}>13. Changes to this policy</h2>
            <p style={pStyle}>We may update this Privacy Policy from time to time. We will post the updated policy with a new &quot;Last updated&quot; date. If we make material changes, we will take reasonable steps to notify you, such as posting a notice on Margo before the changes take effect. Continued use after an update becomes effective means you accept the revised policy. If you do not agree, stop using Margo and delete your account if you wish.</p>

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
