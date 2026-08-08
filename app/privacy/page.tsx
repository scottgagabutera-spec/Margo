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
const h3Style: React.CSSProperties = {
  fontFamily: font,
  fontSize: '0.95rem',
  fontWeight: 600,
  color: 'var(--text)',
  margin: '1.6em 0 0.6em',
}
const ulStyle: React.CSSProperties = { paddingLeft: '20px', marginBottom: '1.4em' }
const liStyle: React.CSSProperties = { marginBottom: '0.5em' }
const linkStyle: React.CSSProperties = { color: 'var(--gold)', textDecoration: 'none' }

export default function PrivacyPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '88px 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Privacy Policy</div>

          <h1 style={{ fontFamily: font, fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Your data.<br />Kept simple.
          </h1>
          <div style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '32px' }}>Last updated: August 2026</div>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: font, fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>

            <p style={pStyle}>Margo (&quot;we,&quot; &quot;us,&quot; &quot;Margo&quot;) operates trymargo.com and the Margo app. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use Margo.</p>

            <h2 style={h2Style}>1. Information We Collect</h2>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Account information.</strong> When you create a Margo account, we collect your email address, and — if you sign in with Google or Discord — the basic profile information those providers share with us (such as your name and profile photo) to set up your account. An account is required to post, message, or interact with content on Margo.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Profile information.</strong> Your username, display name, avatar, bio, signature lyric, and any privacy/messaging preferences you set.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Content you post.</strong> Lyrics, Lyric Backs, Replays, quotes, comments, and any other content you create or share on Margo.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Messages.</strong> Direct messages you send to other users.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Uploaded media (artists).</strong> If you apply as an artist and are approved, audio files, artwork, and related metadata you upload to your Margo catalog.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Usage and engagement data.</strong> Which posts you view, resonate with, or replay; play counts; and similar interaction data, used to power features like counts and personalization.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Device and session data.</strong> Basic technical information such as browser language/region, and a local session identifier used to avoid double-counting views or plays.</p>
            <p style={pStyle}>We do not collect payment information — Margo does not currently process payments.</p>

            <h2 style={h2Style}>2. How We Use Your Information</h2>
            <p style={pStyle}>We use the information above to:</p>
            <ul style={ulStyle}>
              <li style={liStyle}>Operate and maintain your account and Margo&apos;s core features (posting, Resonate, Lyric Back, Replay, messaging, Card export)</li>
              <li style={liStyle}>Personalize your feed and recommendations</li>
              <li style={liStyle}>Analyze the emotional tone of lyrics you compose or interact with, to power features such as vibe tagging and personalization</li>
              <li style={liStyle}>Moderate content for safety and enforce our Terms</li>
              <li style={liStyle}>Respond to reports, support requests, and copyright notices</li>
              <li style={liStyle}>Improve Margo&apos;s features and reliability</li>
            </ul>
            <p style={pStyle}>We process personal information to provide Margo&apos;s services, comply with legal obligations, protect our legitimate interests (such as preventing abuse and improving the platform), and, where required, based on your consent.</p>

            <h2 style={h2Style}>3. Service Providers and Third-Party Services</h2>

            <h3 style={h3Style}>Services that process information for Margo</h3>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Supabase</strong> — provides our database, authentication, file storage, and related infrastructure. It processes information needed to operate your Margo account and content.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>OpenAI</strong> — processes certain lyric text for features such as vibe tagging and content moderation. For our artist lyric-sync feature, the full uploaded audio file is sent to OpenAI&apos;s API for transcription and time alignment.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Vercel</strong> — our hosting provider. We use Vercel Analytics, a privacy-oriented, cookieless tool, to understand aggregate site usage. It does not track you individually across other websites.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Firebase</strong> — used in a limited, legacy capacity for parts of our landing page and internal admin tools. It does not receive core account, post, or message data.</p>

            <h3 style={h3Style}>Services you choose to use</h3>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Google and Discord</strong> — if you sign in using Google or Discord, those providers process your login under their own privacy policies. We only receive the basic profile information needed to create your Margo account.</p>

            <h3 style={h3Style}>External song information</h3>
            <p style={pStyle}>When you search for or attach a song to a post, we query public song databases (including Genius and Apple Music) for metadata like titles, artists, and thumbnails. We don&apos;t send your personal account information as part of that search. Some posts may also contain YouTube thumbnails or metadata that Margo previously retrieved and stored; we don&apos;t currently make YouTube API requests as part of normal app use.</p>

            <p style={pStyle}>We do not sell or rent your personal information to third parties, and we do not use advertising trackers.</p>
            <p style={pStyle}>Your information may be processed in countries other than the one where you live. Where required, we take appropriate safeguards for international data transfers.</p>

            <h2 style={h2Style}>4. Public Content and Public Files</h2>
            <p style={pStyle}>Some information on Margo is public by design:</p>
            <ul style={ulStyle}>
              <li style={liStyle}>Posts, Lyric Backs, and Replays you share publicly are visible to other users (or to anyone, if your account is not private)</li>
              <li style={liStyle}>Artist-uploaded audio, artwork, and certain media files, along with your profile avatar, are stored using publicly accessible URLs so they can be delivered efficiently. Anyone with the direct URL may be able to access those files, even without a Margo account.</li>
            </ul>
            <p style={pStyle}>If your account is set to private, your posts and profile are only visible to accepted followers, subject to the features described in our Terms of Service.</p>

            <h2 style={h2Style}>5. Cookies and Local Storage</h2>
            <p style={pStyle}>Margo uses a combination of cookies and browser local storage to keep the app working and keep you signed in.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Session cookie.</strong> When you sign in, Margo uses a session cookie to keep you authenticated and securely associate requests with your account. The cookie is scoped to trymargo.com and is not used for advertising or cross-site tracking. We use browser and server-side security measures designed to protect session information.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Local storage.</strong> We also use your browser&apos;s local storage for a few specific, non-authentication purposes: caching which posts you&apos;ve resonated with or replayed so the app feels fast, remembering some UI preferences, and maintaining a local session identifier used only to avoid counting the same view or play multiple times. None of this is used for authentication or shared with third parties.</p>
            <p style={pStyle}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>Other cookies.</strong> We may use a small number of additional cookies for basic interface functionality (such as remembering whether a sidebar is expanded or collapsed). These are not used for advertising or cross-site tracking.</p>
            <p style={pStyle}>We do not use third-party advertising or cross-site tracking cookies.</p>

            <h2 style={h2Style}>6. Data Retention and Account Deletion</h2>
            <p style={pStyle}>When you delete your account, we delete your profile, posts, messages, follow relationships, uploaded songs and files, and associated engagement data tied to your account from our active systems, subject to information we may retain for legal, security, abuse-prevention, or other legitimate purposes described below. Your login credentials are permanently removed and cannot be recovered.</p>
            <p style={pStyle}>Certain information may be retained where required by law, to resolve disputes, enforce our agreements, prevent abuse, or remain temporarily in secure backups until those backups are overwritten in the ordinary course of our backup cycle.</p>
            <p style={pStyle}>You can also deactivate your account (a reversible, private state) from Settings without permanently deleting it.</p>

            <h2 style={h2Style}>7. Your Rights and Choices</h2>
            <p style={pStyle}>Depending on applicable law, you may have rights to access, correct, delete, or request a copy of your personal information, or object to or restrict certain processing. To exercise any of these rights, or if you have questions about your data, contact us at <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a>. We may need to verify your identity before completing certain requests.</p>
            <p style={pStyle}>You can update most of your account information — including your username, bio, avatar, and privacy settings — directly in Settings at any time.</p>

            <h2 style={h2Style}>8. Security</h2>
            <p style={pStyle}>We use reasonable administrative, technical, and organizational measures designed to protect your information. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>

            <h2 style={h2Style}>9. Third-Party Links</h2>
            <p style={pStyle}>Margo may link to third-party websites or services. We are not responsible for the privacy practices of those third parties, and we encourage you to review their privacy policies.</p>

            <h2 style={h2Style}>10. Business Transfers</h2>
            <p style={pStyle}>If Margo is involved in a merger, acquisition, financing, or sale of assets, your information may be transferred as part of that transaction. We will take reasonable steps to ensure your information remains protected under this Privacy Policy.</p>

            <h2 style={h2Style}>11. Children&apos;s Privacy</h2>
            <p style={pStyle}>Margo is not directed at children, and we do not knowingly collect personal information from children in violation of applicable law. If you believe a child has provided us with personal information, please contact us at <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a> and we will take appropriate action.</p>

            <h2 style={h2Style}>12. Changes to This Policy</h2>
            <p style={pStyle}>We may update this Privacy Policy from time to time. If we make material changes, we&apos;ll take reasonable steps to notify you, such as posting a notice on Margo before the changes take effect.</p>

            <h2 style={h2Style}>13. Contact Us</h2>
            <p style={pStyle}>Questions about this policy or your data: <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a></p>
            <p style={pStyle}>Copyright-related requests: <a href="mailto:dmca@trymargo.com" style={linkStyle}>dmca@trymargo.com</a> — see our <Link href="/dmca" style={linkStyle}>DMCA / Copyright Policy</Link></p>
            <p style={pStyle}>This policy was last updated August 2026.</p>

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
