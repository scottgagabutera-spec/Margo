'use client'
import MargoLogo from '@/components/MargoLogo';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

interface Post {
  id: string;
  text?: string;
  emotion?: string;
  status?: string;
  username?: string;
  timestamp?: number;
  knowledge?: { artist?: string; song?: string };
}

// Emotion system
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

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [featuredLyric, setFeaturedLyric] = useState<{text:string,artist:string,song:string} | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!db) return;
    const unsub = onValue(ref(db, 'posts'), (snap) => {
      const data: Post[] = [];
      snap.forEach((child) => {
        const p = child.val();
        p.id = child.key;
        if (p.status !== 'hidden' && p.status !== 'private') data.unshift(p);
      });
      setAllPosts(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsub = onValue(ref(db, 'adminConfig/featuredLyric'), (snap) => {
      if (snap.exists()) setFeaturedLyric(snap.val());
    });
    return () => unsub();
  }, []);

  if (!mounted) return null;

  const liveCards = allPosts.slice(0, 4);

  const ac: Record<string,number> = {};
  const sc: Record<string,number> = {};
  const ec: Record<string,number> = {};
  allPosts.forEach(p => {
    const a = p.knowledge?.artist;
    const s = p.knowledge?.song;
    const e = p.emotion || 'Nostalgia';
    if (a && a !== 'Unknown Artist') { const k = a.trim(); ac[k] = (ac[k]||0)+1; }
    if (s && s !== 'Unknown Song')   { const k = s.trim(); sc[k] = (sc[k]||0)+1; }
    ec[e] = (ec[e]||0)+1;
  });
  const ae = Object.entries(ac).sort((a,b) => b[1]-a[1]);
  const se = Object.entries(sc).sort((a,b) => b[1]-a[1]);
  const te = Object.entries(ec).sort((a,b) => b[1]-a[1])[0];
  const topArtist = ae[0]?.[1] >= 2 ? ae[0][0] : null;
  const topSong = se[0]?.[1] >= 2 ? se[0][0] : null;
  const topEmotion = te ? te[0] : null;

  const stats = [
    { number: String(allPosts.length || '0'), label: 'Lyrics', context: 'on Margo' },
    { number: String(Object.keys(ac).length || '0'), label: 'Artists', context: 'quoted on Margo' },
    { number: String(Object.keys(sc).length || '0'), label: 'Songs', context: 'on Margo' },
    { value: topArtist || '—', label: 'Top Artist', context: 'most quoted' },
    { value: topSong || '—', label: 'Top Song', context: 'most used' },
    { value: topEmotion || '—', label: 'Top Feeling', context: 'right now' },
  ];

  const timeAgo = (ts?: number) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  };

  const navLink: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '0.6rem',
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
        <div style={{position:'absolute', top:'-8rem', left:'-8rem', width:'24rem', height:'24rem', background:'var(--gold-glow)', borderRadius:'50%', filter:'blur(80px)'}} />
        <div style={{position:'absolute', bottom:'-10rem', right:'-10rem', width:'24rem', height:'24rem', background:'rgba(232,197,71,0.04)', borderRadius:'50%', filter:'blur(80px)'}} />
      </div>

      {/* Nav */}
      <nav style={{
        position:'relative', zIndex:10,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 40px',
        borderBottom:'1px solid var(--border)',
        backdropFilter:'blur(12px)',
      }}>
        <a href="/" style={{textDecoration:'none'}}>
          <MargoLogo tier="symbol" size={32} rings wordmark />
        </a>
        <a href="/music" style={{...navLink, color:'var(--gold)', fontWeight:700}}>Music</a>
      </nav>

      {/* Hero */}
      <section style={{
        position:'relative', zIndex:5,
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'32px 24px 16px',
        textAlign:'center',
        maxWidth:'56rem', margin:'0 auto',
      }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:'8px',
          marginBottom:'24px', padding:'8px 16px',
          background:'var(--gold-faint)',
          border:'1px solid var(--gold-border)',
          borderRadius:'50px',
        }}>
          <div style={{width:'6px', height:'6px', background:'var(--gold)', borderRadius:'50%'}} />
          <span style={{fontSize:'0.6rem', color:'var(--gold)', fontFamily:'var(--font-lora),serif', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase'}}>
            {allPosts.length || '…'} lyrics live right now
          </span>
        </div>

        <h1 style={{
          fontFamily:'var(--font-lora), serif',
          fontSize:'clamp(2.5rem, 8vw, 5rem)',
          fontWeight:300,
          lineHeight:1.1,
          letterSpacing:'-0.02em',
          color:'var(--text)',
          marginBottom:'16px',
        }}>
          Say it with a song.
        </h1>

        <p style={{
          fontFamily:'var(--font-lora), serif',
          fontSize:'0.95rem',
          color:'var(--text-2)',
          lineHeight:1.7,
          maxWidth:'32rem',
          marginBottom:'32px',
          fontStyle:'italic',
        }}>
          The lyric you send. The one they send back. That&apos;s Margo.
        </p>

        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', width:'100%', maxWidth:'290px', marginBottom:'32px'}}>
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
          <a href="/compose" style={{
            padding:'13px 28px',
            background:'transparent',
            color:'var(--text-2)',
            border:'1px solid var(--border-hi)',
            borderRadius:'50px',
            fontFamily:'var(--font-lora),serif',
            fontWeight:600,
            fontSize:'0.6rem',
            letterSpacing:'1px',
            textTransform:'uppercase',
            textDecoration:'none',
            minHeight:'48px',
            width:'100%',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            transition:'all 150ms ease',
          }}>↓ Share a Lyric</a>
        </div>
      </section>

      {/* Featured Lyric */}
      {featuredLyric && (
        <section style={{position:'relative', zIndex:5, padding:'0 24px', maxWidth:'48rem', margin:'0 auto 32px'}}>
          <div style={{fontSize:'0.6rem', color:'var(--text-3)', textAlign:'center', fontFamily:'var(--font-lora),serif', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'16px'}}>↓ Featured lyric</div>
          <div style={{
            background:'var(--surface)',
            border:'1px solid var(--gold-border)',
            borderRadius:'16px',
            padding:'40px 32px',
            textAlign:'center',
          }}>
            <p style={{fontFamily:'var(--font-lora),serif', fontStyle:'italic', fontSize:'1.5rem', color:'var(--text)', lineHeight:1.6, marginBottom:'16px'}}>
              &ldquo;{featuredLyric.text}&rdquo;
            </p>
            <p style={{fontFamily:'var(--font-lora),serif', fontSize:'0.82rem', color:'var(--gold)', letterSpacing:'0.5px'}}>
              — {featuredLyric.artist}{featuredLyric.song ? ` · ${featuredLyric.song}` : ''}
            </p>
          </div>
        </section>
      )}
      {/* Lyric Stream */}
      <section style={{position:'relative', zIndex:5, width:'100%', margin:'0 auto 48px', overflow:'hidden'}}>
        <div style={{fontSize:'0.6rem', color:'var(--text-3)', textAlign:'center', fontFamily:'var(--font-lora),serif', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'20px'}}>↓ What people are saying right now</div>
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

      {/* Divider */}
      <div style={{height:'1px', background:'linear-gradient(to right, transparent, var(--border), transparent)', margin:'32px 0'}} />

      {/* Stats */}
      <section style={{position:'relative', zIndex:5, maxWidth:'80rem', margin:'0 auto', padding:'0 24px 48px'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0'}}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{
              display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
              padding:'20px 12px',
              borderRight: idx % 3 !== 2 ? '1px solid var(--border)' : 'none',
              borderBottom: idx < 3 ? '1px solid var(--border)' : 'none',
            }}>
              {stat.number ? (
                <div style={{fontFamily:'var(--font-lora),serif', fontSize:'2rem', fontWeight:700, color:'var(--text)', lineHeight:1, marginBottom:'8px'}}>{stat.number}</div>
              ) : (
                <div style={{fontFamily:'var(--font-lora),serif', fontSize:'1.1rem', fontWeight:700, color:'var(--gold)', lineHeight:1, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px'}}>{stat.value}</div>
              )}
              <div style={{fontFamily:'var(--font-lora),serif', fontSize:'0.6rem', fontWeight:700, color:'var(--text-3)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'4px'}}>{stat.label}</div>
              <div style={{fontFamily:'var(--font-lora),serif', fontSize:'0.6rem', color:'var(--text-2)', letterSpacing:'0.5px'}}>{stat.context}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position:'relative', zIndex:10,
        borderTop:'1px solid var(--border)',
        padding:'24px 40px',
        display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'24px',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'24px'}}>
          {['About','Privacy','Terms','Contact'].map(link => (
            <a key={link} href={`/${link.toLowerCase()}`} style={{
              fontSize:'0.6rem', color:'var(--text-3)',
              fontFamily:'var(--font-lora),serif',
              letterSpacing:'1px', textTransform:'uppercase',
              textDecoration:'none', transition:'color 150ms ease',
            }}>{link}</a>
          ))}
        </div>
        <div style={{fontSize:'0.6rem', color:'var(--text-3)', fontFamily:'var(--font-lora),serif', letterSpacing:'1px'}}>© {new Date().getFullYear()} Margo</div>
      </footer>
    </div>
  );
}
