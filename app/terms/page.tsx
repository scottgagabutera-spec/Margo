'use client'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '88px 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Terms of Use</div>

          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Clear rules.<br />No surprises.
          </h1>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '32px' }}>Effective: May 2026</div>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>

            <p style={{ marginBottom: '1.4em' }}>By using Margo, you agree to these terms. They are written to be readable — not to trap you.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>What Margo is</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo is a social platform where people communicate through song lyrics — sharing feelings, moments, and culture through the lines that say what words alone cannot.</p>
            <p style={{ marginBottom: '1.4em' }}>Margo currently surfaces music through licensed third-party streaming platforms and publicly available metadata. As Margo grows, this may expand to include direct licensed streaming and additional integrations. We encourage you to check back here periodically as the platform evolves.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>YouTube Terms of Service</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo uses the YouTube Data API v3 to retrieve publicly available song and video metadata. By using any feature on Margo that involves YouTube data — including song search, video previews, and metadata display — <strong style={{ color: 'var(--text)', fontWeight: 600 }}>you agree to be bound by the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>YouTube Terms of Service</a></strong>.</p>
            <p style={{ marginBottom: '1.4em' }}>Margo's use of YouTube API Services is governed by the <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>YouTube API Services Terms of Service</a>. Google's privacy practices are described in the <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Google Privacy Policy</a>.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>What you post</h2>
            <p style={{ marginBottom: '1.4em' }}>You are responsible for the content you submit. By posting you confirm that your content does not violate copyright or anyone's rights, does not contain unlawful or harmful material, is not spam or impersonation, and does not violate the dignity of any person or group.</p>
            <p style={{ marginBottom: '1.4em' }}>You keep ownership of anything you post. By posting, you give Margo a non-exclusive, royalty-free licence to display your content within the platform. <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Margo reserves the right to remove any content at its discretion, without notice.</strong></p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Lyrics and copyright</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo does not claim ownership of any song lyrics, recordings, or third-party intellectual property. Short lyric excerpts shared for personal, expressive, and social purposes are consistent with fair use principles in many jurisdictions. You are solely responsible for the content you post.</p>
            <p style={{ marginBottom: '1.4em' }}>If you are a rights holder and believe content on Margo infringes your rights, contact us at <a href="mailto:contact@trymargo.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>contact@trymargo.com</a> and we will act promptly.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Original music</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo creates and publishes original music owned entirely by Margo, commercially licensed and distributed across major streaming platforms. All rights reserved. You may not reproduce, redistribute, or claim ownership of any original Margo music without explicit written permission.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Anonymous usernames</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo assigns you a randomly generated username when you post. This keeps the focus on the lyric and the feeling — not on identity or follower counts. You may edit your username once. Margo reserves the right to retire or reassign usernames at any time.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Changes to these terms</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo is evolving. These terms may be updated as the platform grows. We encourage you to check back here periodically — continued use of Margo constitutes acceptance of any updates.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Limitation of liability</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo is provided as-is. To the fullest extent permitted by applicable law, Margo is not liable for user-generated content, third-party services, service interruptions, data loss, or any indirect damages arising from use of the platform.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Contact</h2>
            <p style={{ marginBottom: '1.4em' }}>Questions about these terms? Reach us at <a href="mailto:contact@trymargo.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>contact@trymargo.com</a></p>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            {['about', 'privacy', 'terms', 'contact'].map(p => (
              <Link key={p} href={`/${p}`} style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', textDecoration: 'none' }}>{p}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
