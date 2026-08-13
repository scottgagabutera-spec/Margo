'use client'
import MargoLogo from '@/components/MargoLogo';
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useIdentity } from '@/hooks/useIdentity';
import { LandingExchangeSkeleton, LandingRedirectSkeleton } from '@/components/margo-skeletons';
import {
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
  SpotifyIcon,
} from '@/components/icons';
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts';

const FOOTER_PRODUCT = [
  { label: 'Feed', href: '/feed' },
  { label: 'Discover', href: '/discover' },
  { label: 'Songs', href: '/discover/songs' },
] as const

const FOOTER_LEGAL = [
  { label: 'About', href: '/about' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'DMCA', href: '/dmca' },
  { label: 'Contact', href: '/contact' },
] as const

const FOOTER_SOCIAL = [
  { label: 'Instagram', href: 'https://www.instagram.com/officialtrymargo', Icon: InstagramIcon },
  { label: 'TikTok', href: 'https://www.tiktok.com/@officialtrymargo', Icon: TikTokIcon },
  { label: 'X', href: 'https://x.com/OfficialUTM', Icon: XIcon },
  { label: 'YouTube', href: 'https://youtube.com/@trymargo', Icon: YouTubeIcon },
] as const

const FOOTER_LISTEN = [
  { label: 'Spotify', href: 'https://open.spotify.com/artist/0rGTnmN8rE5so9ibBrhTbJ', Icon: SpotifyIcon },
] as const

const footerLinkStyle: CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text)',
  fontFamily: UI_FONT,
  fontWeight: 600,
  letterSpacing: '0.5px',
  textDecoration: 'none',
  padding: '10px 4px',
  minHeight: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  boxSizing: 'border-box',
}

const footerLegalLinkStyle: CSSProperties = {
  ...footerLinkStyle,
  color: 'var(--text-muted)',
  fontWeight: 500,
}

const footerColLabelStyle: CSSProperties = {
  fontSize: '0.6rem',
  fontFamily: UI_FONT,
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  marginBottom: '8px',
}

const footerIconLinkStyle: CSSProperties = {
  width: 'var(--margo-touch-min)',
  height: 'var(--margo-touch-min)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  borderRadius: '50%',
}

interface Post {
  id: string;
  text?: string;
  emotion?: string;
  status?: string;
  username?: string;
  timestamp?: number;
  knowledge?: { artist?: string; song?: string };
}

interface ExchangePair {
  postLyric: string;
  postSong?: string;
  postArtist?: string;
  postUser?: string;
  replyLyric: string;
  replySong?: string;
  replyArtist?: string;
  replyUser?: string;
}

// Emotion system (ticker only)
const EMOTION_COLORS: Record<string,string> = {
  love:'#FF6B9D', heartbreak:'#ff6060', hope:'#7B9FFF', nostalgia:'#E8C547',
  healing:'#4ade80', joy:'#ffc847', rage:'#FF6440', loneliness:'#a0a0ff',
  sendit:'#00e5c8', letout:'#c864ff',
};
const VIBE_LABELS: Record<string,string> = {
  love:'Love', heartbreak:'Heartbreak', hope:'Hope', nostalgia:'Nostalgia',
  healing:'Healing', joy:'Joy', rage:'Rage', loneliness:'Loneliness',
  sendit:'SendIt', letout:'LetOut',
};
const STREAM_SAMPLES: Post[] = [
  { id:'s1', text:'You can dance, you can jive, having the time of your life', emotion:'joy',       knowledge:{ artist:'ABBA', song:'Dancing Queen' } },
  { id:'s2', text:'Who cares when more light goes out? Well I do.',            emotion:'hope',      knowledge:{ artist:'Linkin Park', song:'One More Light' } },
  { id:'s3', text:'On and on, the dj playing my song',                        emotion:'letout',    knowledge:{ artist:'Erykah Badu', song:'On & On' } },
  { id:'s4', text:"I found love where it wasn't supposed to be",              emotion:'love',      knowledge:{ artist:'Ed Sheeran', song:'Happier' } },
  { id:'s5', text:'Every scar will build my throne',                          emotion:'healing',   knowledge:{ artist:'Florence', song:'Dog Days Are Over' } },
  { id:'s6', text:'We are young, so let us set the world on fire',            emotion:'sendit',    knowledge:{ artist:'fun.', song:'We Are Young' } },
];
function getTickerPosts(posts: Post[]): Post[] {
  if (posts.length < 6) return STREAM_SAMPLES;
  const recent  = posts.slice(0, 4);
  const rest    = posts.filter(p => !recent.includes(p));
  const byViews = rest.slice(0, 4);
  const random  = rest.slice(4).sort(() => Math.random() - 0.5).slice(0, 4);
  return [...recent, ...byViews, ...random];
}
function TickerCard({ post }: { post: Post }) {
  const emotion  = (post.emotion || 'nostalgia').toLowerCase();
  const color    = EMOTION_COLORS[emotion] || 'var(--gold)';
  const label    = VIBE_LABELS[emotion]    || post.emotion || 'Nostalgia';
  const text     = post.text || '';
  const display  = text.length > 44 ? text.substring(0, 44) + '…' : text;
  const seed     = post.id ? post.id.charCodeAt(0) : 0;
  const featured = seed % 3 === 0;
  return (
    <div style={{
      display:'inline-flex', flexDirection:'column', gap:'8px',
      padding:'14px 18px',
      background: featured ? 'rgba(232,197,71,0.04)' : 'rgba(255,255,255,0.03)',
      border:`1px solid ${featured ? 'rgba(232,197,71,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius:'14px', flexShrink:0, width:'220px',
      pointerEvents:'none', userSelect:'none',
    }}>
      <p style={{
        fontFamily: LYRIC_FONT, fontStyle: 'italic',
        fontSize: '0.95rem', color: 'rgba(255,255,255,0.82)',
        lineHeight: 1.5, margin: 0, overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{display}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          fontFamily: UI_FONT, fontSize: '0.6rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '1.5px',
          padding: '3px 8px', borderRadius: '50px',
          background: 'rgba(255,255,255,0.06)', color,
        }}>{label}</span>
        {post.knowledge?.artist && post.knowledge.artist !== 'Unknown Artist' && (
          <span style={{
            fontFamily: UI_FONT, fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.25)', overflow: 'hidden',
            whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100px',
          }}>{post.knowledge.artist}</span>
        )}
      </div>
    </div>
  );
}

// Fallback exchange — hero empty-state only when site_featured_exchange lacks both lyrics.
// Mirrors the exported Lyric Back card format (see MARGO_mirror_LyricBack card).
const FALLBACK_EXCHANGE: ExchangePair = {
  postLyric: "Keep me in your mirror but don't take your eyes off the road, holding on won't get us any nearer cause we got a long way to go…",
  postSong: 'Mirror',
  postArtist: 'Madison',
  replyLyric: 'See you again.',
  replySong: 'See You Again',
  replyArtist: 'Wiz Khalifa',
};

// Two chat-style bubbles — the actual mechanic, shown rather than described.
function ExchangeBubble({ variant, lyric, meta, byline }: {
  variant: 'gold' | 'dark';
  lyric: string;
  meta?: string;
  byline?: string;
}) {
  const isGold = variant === 'gold';
  const tailStyle: React.CSSProperties = {
    position: 'absolute', bottom: '-9px', width: '18px', height: '18px',
    background: isGold ? 'var(--gold)' : 'var(--surface-2)',
    borderRight: isGold ? 'none' : '1px solid var(--border-hi)',
    borderBottom: isGold ? 'none' : '1px solid var(--border-hi)',
    transform: 'rotate(45deg)',
    ...(isGold ? { left: '28px' } : { right: '28px' }),
  };
  return (
    <div style={{
      position: 'relative',
      alignSelf: isGold ? 'flex-start' : 'flex-end',
      width: '92%',
      maxWidth: '460px',
      background: isGold ? 'var(--gold)' : 'var(--surface-2)',
      color: isGold ? 'var(--bg)' : 'var(--text)',
      border: isGold ? 'none' : '1px solid var(--border-hi)',
      borderRadius: '18px',
      padding: '20px 24px',
      textAlign: 'left',
      boxSizing: 'border-box',
    }}>
      <p style={{
        fontFamily: LYRIC_FONT, fontStyle: 'italic',
        fontSize: '1.1rem', lineHeight: 1.6, margin: 0,
      }}>{lyric}</p>
      {(meta || byline) && (
        <div style={{
          marginTop: '14px', paddingTop: '12px',
          borderTop: `1px solid ${isGold ? 'rgba(7,6,10,0.15)' : 'var(--border)'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          gap: '8px', flexWrap: 'wrap',
        }}>
          {meta && (
            <span style={{
              fontFamily: UI_FONT, fontSize: '0.75rem', fontWeight: 400,
              letterSpacing: '0.5px', opacity: 0.85,
            }}>{meta}</span>
          )}
          {byline && (
            <span style={{
              fontFamily: UI_FONT, fontSize: '0.7rem', fontWeight: 400,
              opacity: isGold ? 0.7 : 0.5,
            }}>{byline}</span>
          )}
        </div>
      )}
      <div style={tailStyle} />
    </div>
  );
}

function Exchange({ pair, spacing = '40px' }: { pair: ExchangePair; spacing?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing, width: '100%' }}>
      <ExchangeBubble
        variant="gold"
        lyric={`"${pair.postLyric}"`}
        meta={pair.postSong}
        byline={[pair.postArtist, pair.postUser ? `@${pair.postUser}` : null].filter(Boolean).join(' · ')}
      />
      <ExchangeBubble
        variant="dark"
        lyric={`"${pair.replyLyric}"`}
        meta={pair.replySong}
        byline={[pair.replyArtist, pair.replyUser ? `@${pair.replyUser}` : null].filter(Boolean).join(' · ')}
      />
    </div>
  );
}

const HOW_IT_WORKS = [
  { n: '1', title: 'Post a lyric', text: 'Pick a line that says how you feel. Tag the vibe.' },
  { n: '2', title: 'Get a Lyric Back', text: 'Someone replies with a line of their own.' },
  { n: '3', title: 'Discover the artist', text: 'Follow, listen, hear the whole song.' },
];

export default function Home() {
  const router = useRouter();
  const { user, loading: identityLoading } = useIdentity();
  const [mounted, setMounted] = useState(false);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [featuredExchange, setFeaturedExchange] = useState<ExchangePair | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  // Returning signed-in (non-anonymous) users don't need the marketing
  // page re-sold to them — send them straight to their feed. Anonymous
  // and first-time visitors fall through and see the page as built.
  useEffect(() => {
    if (identityLoading) return;
    if (user && !user.isAnonymous) {
      router.replace('/feed');
    }
  }, [identityLoading, user, router]);

  // B1: live corpus from Supabase (ticker only).
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    ;(async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, text, emotion, status, song_title, artist_name, created_at')
        .is('parent_post_id', null)
        .not('status', 'in', '("hidden","private")')
        .order('created_at', { ascending: false })
        .limit(40)
      if (cancelled) return
      if (error) {
        console.error('[landing] failed to load posts for ticker:', error.message)
        setAllPosts([])
        return
      }
      setAllPosts(
        (data ?? []).map((row) => ({
          id: row.id,
          text: row.text ?? undefined,
          emotion: row.emotion ?? undefined,
          status: row.status ?? undefined,
          timestamp: row.created_at ? new Date(row.created_at).getTime() : undefined,
          knowledge:
            row.song_title || row.artist_name
              ? { song: row.song_title ?? undefined, artist: row.artist_name ?? undefined }
              : undefined,
        })),
      )
    })()
    return () => { cancelled = true }
  }, []);

  // B2: curated hero exchange from Supabase singleton (id=1).
  // Only set featuredExchange when both lyrics are non-empty; else hero uses FALLBACK_EXCHANGE.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    ;(async () => {
      const { data, error } = await supabase
        .from('site_featured_exchange')
        .select('post_text, post_artist, post_song, post_username, reply_text, reply_artist, reply_song, reply_username')
        .eq('id', 1)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        console.error('[landing] failed to load featured exchange:', error.message)
        setFeaturedExchange(null)
        setFeaturedLoading(false)
        return
      }
      const postLyric = (data?.post_text || '').trim()
      const replyLyric = (data?.reply_text || '').trim()
      if (!postLyric || !replyLyric) {
        setFeaturedExchange(null)
        setFeaturedLoading(false)
        return
      }
      setFeaturedExchange({
        postLyric,
        postSong: data?.post_song || undefined,
        postArtist: data?.post_artist || undefined,
        postUser: data?.post_username || undefined,
        replyLyric,
        replySong: data?.reply_song || undefined,
        replyArtist: data?.reply_artist || undefined,
        replyUser: data?.reply_username || undefined,
      })
      setFeaturedLoading(false)
    })()
    return () => { cancelled = true }
  }, []);

  // Hydration gate: avoid SSR/client mismatch on identity-dependent branches.
  if (!mounted) return null

  // Don't flash marketing to signed-in users — show a Feed-shaped shell
  // while identity resolves / redirect runs (avoids a blank “nothing responds”).
  if (identityLoading || (user && !user.isAnonymous)) {
    return <LandingRedirectSkeleton />
  }

  const heroExchange = featuredExchange || FALLBACK_EXCHANGE;

  const navLink: CSSProperties = {
    padding: '8px 12px',
    fontSize: '0.75rem',
    fontFamily: UI_FONT,
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'all 150ms ease',
  };

  return (
    <div style={{position:'relative', width:'100%', overflow:'hidden', background:'var(--bg)'}}>
      {/* Ambient */}
      <div style={{position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0}}>
        <div style={{position:'absolute', top:'-10rem', left:'-10rem', width:'22rem', height:'22rem', background:'rgba(232,197,71,0.05)', borderRadius:'50%', filter:'blur(120px)'}} />
        <div style={{position:'absolute', bottom:'-10rem', right:'-10rem', width:'22rem', height:'22rem', background:'rgba(232,197,71,0.03)', borderRadius:'50%', filter:'blur(120px)'}} />
      </div>

      {/* Nav */}
      <nav className="margo-landing-nav" style={{
        position:'relative', zIndex:10,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 40px',
      }}>
        <a href="/" style={{textDecoration:'none'}}>
          <MargoLogo tier="lockup" size={36} rings wordmark />
        </a>
        <a href="/discover" style={{...navLink, color:'var(--gold)', fontWeight:700}}>Discover</a>
      </nav>

      {/* Hero */}
      <section style={{
        position:'relative', zIndex:5,
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'64px 24px 16px',
        textAlign:'center',
        maxWidth:'56rem', margin:'0 auto',
      }}>
        <h1 style={{
          fontFamily: LYRIC_FONT,
          fontSize: 'clamp(2.25rem, 6vw, 3.75rem)',
          fontWeight: 300,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          marginBottom: '16px',
        }}>
          Talk in lyrics.
        </h1>

        <p style={{
          fontFamily: LYRIC_FONT,
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          maxWidth: '32rem',
          marginBottom: '40px',
          fontStyle: 'italic',
        }}>
          Send a line from a song. Someone sends one back. That&apos;s Margo.
        </p>

        <div style={{ width: '100%', maxWidth: '520px', marginBottom: '40px' }}>
          {featuredLoading ? <LandingExchangeSkeleton /> : <Exchange pair={heroExchange} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '290px', marginBottom: '16px' }}>
          <a href="/feed" style={{
            padding: '17px 28px',
            background: 'var(--gold)',
            color: 'var(--bg)',
            borderRadius: '50px',
            fontFamily: UI_FONT,
            fontWeight: 700,
            fontSize: '0.6rem',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            minHeight: '52px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
            transition: 'all 150ms ease',
          }}>See What&apos;s Live</a>
        </div>
      </section>

      {/* How It Works — stack on mobile (Secondary/Body); 3-col from 640px */}
      <section
        className="margo-how-it-works"
        style={{ position: 'relative', zIndex: 5, maxWidth: '56rem', margin: '0 auto', padding: '24px 16px 56px' }}
      >
        <style>{`
          .margo-how-it-works__grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .margo-how-it-works__num {
            width: 36px; height: 36px; border-radius: 50%;
            background: var(--gold-faint); border: 1px solid var(--gold-border);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 12px;
            font-family: var(--font-geist-sans), system-ui, sans-serif;
            font-size: 0.75rem; font-weight: 700; color: var(--gold);
          }
          .margo-how-it-works__title {
            font-family: var(--font-geist-sans), system-ui, sans-serif;
            font-size: 0.82rem; font-weight: 600; color: var(--text);
            margin: 0 0 8px; line-height: 1.3;
          }
          .margo-how-it-works__body {
            font-family: var(--font-geist-sans), system-ui, sans-serif;
            font-size: 0.95rem; font-weight: 400; color: var(--text-secondary);
            margin: 0; line-height: 1.5;
          }
          @media (min-width: 640px) {
            .margo-how-it-works { padding-left: 24px !important; padding-right: 24px !important; }
            .margo-how-it-works__grid { grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
            .margo-how-it-works__num { width: 40px; height: 40px; margin-bottom: 16px; font-size: 0.95rem; }
            .margo-how-it-works__title { font-size: 1rem; margin-bottom: 8px; }
            .margo-how-it-works__body { font-size: 0.82rem; }
          }
        `}</style>
        <div className="margo-how-it-works__grid">
          {HOW_IT_WORKS.map(step => (
            <div key={step.n} style={{ textAlign: 'center', minWidth: 0 }}>
              <div className="margo-how-it-works__num">{step.n}</div>
              <h3 className="margo-how-it-works__title">{step.title}</h3>
              <p className="margo-how-it-works__body">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lyric Stream */}
      <section style={{position:'relative', zIndex:5, width:'100%', margin:'0 auto 32px', overflow:'hidden'}}>
        <div style={{
          fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center',
          fontFamily: UI_FONT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
          marginBottom: '20px',
        }}>↓ What people are saying right now</div>
        <div style={{
          position:'relative',
          maskImage:'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage:'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        }}>
          <div style={{display:'flex', gap:'12px', marginBottom:'12px', width:'max-content', animation:'marqueLeft 45s linear infinite'}}>
            {[...getTickerPosts(allPosts),...getTickerPosts(allPosts),...getTickerPosts(allPosts)].map((post,i)=>(
              <TickerCard key={`t1-${post.id}-${i}`} post={post}/>
            ))}
          </div>
          <div style={{display:'flex', gap:'12px', width:'max-content', animation:'marqueRight 60s linear infinite'}}>
            {(()=>{
              const src=getTickerPosts(allPosts);
              const off=Math.floor(src.length/2);
              const fill=[...src.slice(off),...src,...src,...src.slice(0,off)];
              return [...fill,...fill,...fill].map((post,i)=>(
                <TickerCard key={`t2-${post.id}-${i}`} post={post}/>
              ));
            })()}
          </div>
        </div>
        <style>{`
          @keyframes marqueLeft  { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
          @keyframes marqueRight { from{transform:translateX(-33.333%)} to{transform:translateX(0)} }
          @media (prefers-reduced-motion:reduce){[style*="marqueLeft"],[style*="marqueRight"]{animation:none!important}}
        `}</style>
      </section>

      {/* Footer — Explore | Legal | Connect (Social + Listen); +32px air above tab bar */}
      <footer className="margo-landing-footer" style={{
        position: 'relative', zIndex: 10,
        padding: '48px 24px calc(var(--margo-page-padding-bottom) + 32px)',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '28px',
        width: '100%', maxWidth: '960px', margin: '0 auto', boxSizing: 'border-box',
      }}>
        <style>{`
          .margo-landing-footer__grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px 32px;
            width: 100%;
          }
          .margo-landing-footer__connect {
            grid-column: 1 / -1;
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
          }
          .margo-landing-footer__connect-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .margo-landing-footer__icons {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            justify-content: center;
          }
          .margo-landing-footer__copy {
            text-align: center;
          }
          @media (min-width: 640px) {
            .margo-landing-footer {
              padding-left: 40px !important;
              padding-right: 40px !important;
            }
            .margo-landing-footer__grid {
              grid-template-columns: 1.1fr 1.1fr 0.95fr;
              gap: 32px 48px;
            }
            .margo-landing-footer__connect {
              grid-column: auto;
              align-items: flex-start;
            }
            .margo-landing-footer__connect-block {
              align-items: flex-start;
            }
            .margo-landing-footer__icons {
              justify-content: flex-start;
            }
            .margo-landing-footer__copy {
              text-align: left;
            }
          }
        `}</style>
        <div className="margo-landing-footer__grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <div style={footerColLabelStyle}>Explore</div>
            {FOOTER_PRODUCT.map(link => (
              <a key={link.href} href={link.href} style={footerLinkStyle}>{link.label}</a>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <div style={footerColLabelStyle}>Legal</div>
            {FOOTER_LEGAL.map(link => (
              <a key={link.href} href={link.href} style={footerLegalLinkStyle}>{link.label}</a>
            ))}
          </div>
          <div className="margo-landing-footer__connect">
            <div className="margo-landing-footer__connect-block">
              <div style={footerColLabelStyle}>Social</div>
              <div className="margo-landing-footer__icons">
                {FOOTER_SOCIAL.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    style={footerIconLinkStyle}
                  >
                    <Icon size={18} color="currentColor" />
                  </a>
                ))}
              </div>
            </div>
            <div className="margo-landing-footer__connect-block">
              <div style={footerColLabelStyle}>Listen</div>
              <div className="margo-landing-footer__icons">
                {FOOTER_LISTEN.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    style={footerIconLinkStyle}
                  >
                    <Icon size={18} color="currentColor" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="margo-landing-footer__copy" style={{
          fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: UI_FONT, letterSpacing: '1px',
          paddingTop: '8px', borderTop: '1px solid var(--border)',
        }}>
          © {new Date().getFullYear()} Margo
        </div>
      </footer>
    </div>
  );
}