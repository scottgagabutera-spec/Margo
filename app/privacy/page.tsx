'use client'
import Link from 'next/link'
import { MargoNav } from '@/components/margo-nav'

export default function PrivacyPage() {
  return (
    <>
      <MargoNav />
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%',
          filter: 'blur(80px)', opacity: 0.06,
          width: '500px', height: '500px',
          background: 'var(--gold)', top: '-100px', right: '-100px',
        }} />
        <div style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%',
          filter: 'blur(80px)', opacity: 0.06,
          width: '400px', height: '400px',
          background: '#6B4EFF', bottom: '-100px', left: '-100px',
        }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Privacy Policy</div>

          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Your data.<br />Kept simple.
          </h1>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '32px' }}>Effective: May 2026</div>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>

            <p style={{ marginBottom: '1.4em' }}>Margo is built to be as lightweight as possible — on your data and on your trust. We collect only what we need to make the platform work.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>No account required</h2>
            <p style={{ marginBottom: '1.4em' }}>You do not need to create an account to post or browse on Margo. We do not collect your name, email address, phone number, or any personal identity information for basic use of the platform.</p>
            <p style={{ marginBottom: '1.4em' }}>When you post a lyric, Margo assigns you a randomly generated username — like Guitar#4821. This username is not linked to your identity in any way.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>What we store</h2>
            <p style={{ marginBottom: '1.4em' }}>When you post a lyric, Margo stores the following in our database:</p>
            <ul style={{ paddingLeft: '20px', marginBottom: '1.4em' }}>
              <li style={{ marginBottom: '0.5em' }}>The lyric text and song metadata you provide</li>
              <li style={{ marginBottom: '0.5em' }}>Your randomly generated username</li>
              <li style={{ marginBottom: '0.5em' }}>A timestamp of when the post was created</li>
              <li style={{ marginBottom: '0.5em' }}>The language and region of your browser at the time of posting — detected automatically and never linked to your identity</li>
              <li style={{ marginBottom: '0.5em' }}>Engagement data — views, resonates, and Lyric Backs on your post</li>
            </ul>
            <p style={{ marginBottom: '1.4em' }}>This data is stored securely using Google Firebase, operating under <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Google's privacy and security standards</a>.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>YouTube API Services</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo uses the <strong style={{ color: 'var(--text)', fontWeight: 600 }}>YouTube Data API v3</strong> to retrieve publicly available video metadata — including video title, channel name, thumbnail, and video ID — when a user searches for a song or artist name. This metadata is displayed alongside lyric posts and links users directly to YouTube to watch or listen officially.</p>
            <p style={{ marginBottom: '1.4em' }}>Margo does not download, store, or reproduce YouTube video content. Margo does not access private YouTube user data. All YouTube data retrieved is publicly available metadata only.</p>
            <p style={{ marginBottom: '1.4em' }}>YouTube metadata attached to a post is stored in our database alongside the post itself. It is refreshed when a user re-selects a song, and it is deleted when the post is deleted. We do not cache or retain YouTube data beyond its association with an active post.</p>
            <p style={{ marginBottom: '1.4em' }}>By using Margo, you acknowledge that your use of YouTube-related features is also subject to the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>YouTube Terms of Service</a>. Google's privacy practices are described in the <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Google Privacy Policy</a>.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Analytics</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo uses privacy-friendly, cookieless analytics to understand how the platform is used at a general level. This tool does not use cookies, does not track you across websites, and does not collect any personal information.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Local storage and device data</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo uses browser <strong style={{ color: 'var(--text)', fontWeight: 600 }}>local storage</strong> — a standard browser technology similar to cookies — to remember your session preferences, including your randomly generated username and UI settings. This data is stored only on your device and is never shared with third parties or used for advertising.</p>
            <p style={{ marginBottom: '1.4em' }}>We do not place advertising cookies or tracking cookies on your device. No consent banner is required because no personal data is collected through these mechanisms.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>AI features</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo uses OpenAI's API to automatically detect the emotion behind a lyric when you compose a post, and to moderate content before it is published. The lyric text you submit is processed by OpenAI for these purposes. OpenAI does not use this data to train its models when accessed via API. See <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>OpenAI's Privacy Policy</a> for details.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Original music</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo hosts original music created and owned by Margo. This music is licensed for use on the platform and on all major streaming services. No personal data is collected when you interact with it.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Your rights</h2>
            <p style={{ marginBottom: '1.4em' }}>Because Margo does not collect personal identity information, there is no personal profile to delete or export. If you have posted content you would like removed, contact us and we will handle it promptly.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Changes to this policy</h2>
            <p style={{ marginBottom: '1.4em' }}>If Margo introduces account features or materially changes how data is handled, this policy will be updated before those changes go live.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Contact</h2>
            <p style={{ marginBottom: '1.4em' }}>Questions about privacy? Reach us at <a href="mailto:contact@trymargo.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>contact@trymargo.com</a></p>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            {['about', 'privacy', 'terms', 'contact'].map(p => (
              <Link key={p} href={`/${p}`} style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', textDecoration: 'none' }}>{p}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
