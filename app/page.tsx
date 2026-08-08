'use client'
import MargoLogo from '@/components/MargoLogo';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useIdentity } from '@/hooks/useIdentity';

interface Echo {
  lyric?: string;
  artist?: string;
  song?: string;
  username?: string;
  status?: string;
}

interface Post {
  id: string;
  text?: string;
  emotion?: string;
  status?: string;
  username?: string;
  timestamp?: number;
  knowledge?: { artist?: string; song?: string };
  echoes?: Record<string, Echo>;
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
        fontFamily:'var(--font-lora),serif', fontStyle:'italic',
        fontSize:'0.95rem', color:'rgba(255,255,255,0.82)',
        lineHeight:1.5, margin:0, overflow:'hidden',
        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
      }}>{display}</p>
      <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
        <span style={{
          fontFamily:'var(--font-lora),serif', fontSize:'0.6rem', fontWeight:700,
          textTransform:'uppercase', letterSpacing:'1.5px',
          padding:'3px 8px', borderRadius:'50px',
          background:'rgba(255,255,255,0.06)', color,
        }}>{label}</span>
        {post.knowledge?.artist && post.knowledge.artist !== 'Unknown Artist' && (
          <span style={{
            fontFamily:'var(--font-lora),serif', fontSize:'0.6rem',
            color:'rgba(255,255,255,0.25)', overflow:'hidden',
            whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:'100px',
          }}>{post.knowledge.artist}</span>
        )}
      </div>
    </div>
  );
}

// Fallback exchange — default hero after B1 (Supabase posts have no nested echoes,
// so pickExchange rarely matches until B2 featured or a future pair query).
// Mirrors the actual exported Lyric Back card format (see MARGO_mirror_LyricBack card).
const FALLBACK_EXCHANGE: ExchangePair = {
  postLyric: "Keep me in your mirror but don't take your eyes off the road, holding on won't get us any nearer cause we got a long way to go…",
  postSong: 'Mirror',
  postArtist: 'Madison',
  replyLyric: 'See you again.',
  replySong: 'See You Again',
  replyArtist: 'Wiz Khalifa',
};

function pickExchange(posts: Post[]): ExchangePair | null {
  for (const p of posts) {
    if (!p.echoes || !p.text) continue;
    const activeEchoes = Object.values(p.echoes).filter(e => e && e.lyric && e.status !== 'hidden');
    if (activeEchoes.length === 0) continue;
    const echo = activeEchoes[0];
    return {
      postLyric: p.text,
      postSong: p.knowledge?.song,
      postArtist: p.knowledge?.artist,
      postUser: p.username,
      replyLyric: echo.lyric as string,
      replySong: echo.song,
      replyArtist: echo.artist,
      replyUser: echo.username,
    };
  }
  return null;
}

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
        fontFamily: 'var(--font-lora),serif', fontStyle: 'italic',
        fontSize: '1rem', lineHeight: 1.6, margin: 0,
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
              fontFamily: 'var(--font-lora),serif', fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.5px', opacity: 0.85,
            }}>{meta}</span>
          )}
          {byline && (
            <span style={{
              fontFamily: 'var(--font-lora),serif', fontSize: '0.7rem',
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

  // B1: live corpus from Supabase (ticker). Hero pickExchange stays but usually
  // falls through to FALLBACK_EXCHANGE — nested Firebase echoes are gone.
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

  // B2: curated Exchange of the Week from Supabase singleton.
  // Visibility: only set featuredExchange when both lyrics are non-empty (render rule).
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
        return
      }
      const postLyric = (data?.post_text || '').trim()
      const replyLyric = (data?.reply_text || '').trim()
      if (!postLyric || !replyLyric) {
        setFeaturedExchange(null)
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
    })()
    return () => { cancelled = true }
  }, []);

  // Don't render the landing page while we're still figuring out who's
  // asking, or once we already know they're signed in and about to be
  // redirected — avoids a flash of the marketing page for real users.
  if (!mounted || identityLoading || (user && !user.isAnonymous)) return null;

  const heroExchange = pickExchange(allPosts) || FALLBACK_EXCHANGE;

  const navLink: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-lora), serif',
    fontWeight: 600,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: 'var(--text-2)',
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
          <MargoLogo tier="symbol" size={32} rings wordmark />
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
          fontFamily:'var(--font-lora), serif',
          fontSize:'clamp(2.5rem, 8vw, 5rem)',
          fontWeight:300,
          lineHeight:1.1,
          letterSpacing:'-0.02em',
          color:'var(--text)',
          marginBottom:'16px',
        }}>
          Talk in lyrics.
        </h1>

        <p style={{
          fontFamily:'var(--font-lora), serif',
          fontSize:'0.95rem',
          color:'var(--text-2)',
          lineHeight:1.7,
          maxWidth:'32rem',
          marginBottom:'40px',
          fontStyle:'italic',
        }}>
          Send a line from a song. Someone sends one back. That&apos;s Margo.
        </p>

        <div style={{ width: '100%', maxWidth: '520px', marginBottom: '40px' }}>
          <Exchange pair={heroExchange} />
        </div>

        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', width:'100%', maxWidth:'290px', marginBottom:'16px'}}>
          <a href="/feed" style={{
            padding:'17px 28px',
            background:'var(--gold)',
            color:'var(--bg)',
            borderRadius:'50px',
            fontFamily:'var(--font-lora),serif',
            fontWeight:700,
            fontSize:'0.6rem',
            letterSpacing:'1px',
            textTransform:'uppercase',
            textDecoration:'none',
            minHeight:'52px',
            width:'100%',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:'0 6px 28px rgba(232,197,71,0.28)',
            transition:'all 150ms ease',
          }}>See What&apos;s Live</a>
        </div>
      </section>

      {/* How It Works */}
      <section style={{position:'relative', zIndex:5, maxWidth:'56rem', margin:'0 auto', padding:'24px 24px 56px'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'32px'}}>
          {HOW_IT_WORKS.map(step => (
            <div key={step.n} style={{textAlign:'center'}}>
              <div style={{
                width:'40px', height:'40px', borderRadius:'50%',
                background:'var(--gold-faint)', border:'1px solid var(--gold-border)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 16px',
                fontFamily:'var(--font-lora),serif', fontWeight:700, color:'var(--gold)',
              }}>{step.n}</div>
              <h3 style={{fontFamily:'var(--font-lora),serif', fontSize:'1rem', fontWeight:600, color:'var(--text)', marginBottom:'8px'}}>{step.title}</h3>
              <p style={{fontFamily:'var(--font-lora),serif', fontSize:'0.8rem', color:'var(--text-2)', lineHeight:1.6}}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Exchange — curated; only renders when both lyrics are non-empty in site_featured_exchange */}
      {featuredExchange && (
        <section style={{position:'relative', zIndex:5, padding:'0 24px', maxWidth:'40rem', margin:'0 auto 56px'}}>
          <div style={{fontSize:'0.6rem', color:'var(--text-muted)', textAlign:'center', fontFamily:'var(--font-lora),serif', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'20px'}}>Exchange of the Week</div>
          <Exchange pair={featuredExchange} spacing="32px" />
        </section>
      )}

      {/* Lyric Stream */}
      <section style={{position:'relative', zIndex:5, width:'100%', margin:'0 auto 32px', overflow:'hidden'}}>
        <div style={{fontSize:'0.6rem', color:'var(--text-muted)', textAlign:'center', fontFamily:'var(--font-lora),serif', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'20px'}}>↓ What people are saying right now</div>
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

      {/* Explore more music */}
      <section style={{position:'relative', zIndex:5, textAlign:'center', padding:'0 24px 56px', maxWidth:'40rem', margin:'0 auto'}}>
        <h2 style={{fontFamily:'var(--font-lora),serif', fontSize:'1.5rem', fontWeight:600, color:'var(--text)', marginBottom:'12px'}}>
          There&apos;s more where that came from.
        </h2>
        <p style={{fontFamily:'var(--font-lora),serif', fontSize:'0.9rem', lineHeight:1.7}}>
          <a href="/discover" style={{color:'var(--gold)', textDecoration:'none'}}>Browse original songs from independent artists on Margo.</a>
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        position:'relative', zIndex:10,
        padding:'56px 40px var(--margo-page-padding-bottom)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:'20px',
      }}>
        <div style={{display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'8px'}}>
          {['About','Privacy','Terms','DMCA','Contact'].map(link => (
            <a key={link} href={`/${link.toLowerCase()}`} style={{
              fontSize:'1rem', color:'var(--text)',
              fontFamily:'var(--font-lora),serif',
              letterSpacing:'0.5px',
              textDecoration:'none', transition:'color 150ms ease',
              padding:'10px 16px', minHeight:'44px',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              boxSizing:'border-box',
            }}>{link}</a>
          ))}
        </div>
        <div style={{fontSize:'0.7rem', color:'var(--text-2)', fontFamily:'var(--font-lora),serif', letterSpacing:'1px'}}>© {new Date().getFullYear()} Margo</div>
      </footer>
    </div>
  );
}