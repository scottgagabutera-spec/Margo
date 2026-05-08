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
    { number: String(allPosts.length || '0'), label: 'Lyrics', context: 'communicated so far' },
    { number: String(Object.keys(ac).length || '0'), label: 'Artists', context: 'quoted on Margo' },
    { number: String(Object.keys(sc).length || '0'), label: 'Songs', context: 'used to speak' },
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
        <a href="/music" style={navLink}>Music</a>
      </nav>

      {/* Hero */}
      <section style={{
        position:'relative', zIndex:5,
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'48px 24px 32px',
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

        <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'12px', marginBottom:'48px'}}>
          <a href="/feed" style={{
            padding:'14px 32px',
            background:'var(--gold)',
            color:'var(--bg)',
            borderRadius:'50px',
            fontFamily:'var(--font-lora),serif',
            fontWeight:700,
            fontSize:'0.6rem',
            letterSpacing:'1px',
            textTransform:'uppercase',
            textDecoration:'none',
            minHeight:'44px',
            display:'flex',
            alignItems:'center',
            transition:'all 150ms ease',
          }}>See What&apos;s Live</a>
          <a href="/compose" style={{
            padding:'14px 24px',
            background:'transparent',
            color:'var(--text-2)',
            border:'1px solid var(--gold-border)',
            borderRadius:'50px',
            fontFamily:'var(--font-lora),serif',
            fontWeight:600,
            fontSize:'0.6rem',
            letterSpacing:'1px',
            textTransform:'uppercase',
            textDecoration:'none',
            minHeight:'44px',
            display:'flex',
            alignItems:'center',
            transition:'all 150ms ease',
          }}>↓ Share a Lyric</a>
        </div>
      </section>

      {/* Featured Lyric */}
      {featuredLyric && (
        <section style={{position:'relative', zIndex:5, padding:'0 24px', maxWidth:'48rem', margin:'0 auto 48px'}}>
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

      {/* Live Cards */}
      <section style={{position:'relative', zIndex:5, padding:'0 24px', maxWidth:'80rem', margin:'0 auto 48px'}}>
        <div style={{fontSize:'0.6rem', color:'var(--text-3)', textAlign:'center', fontFamily:'var(--font-lora),serif', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'24px'}}>↓ What people are saying right now</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'16px'}}>
          {liveCards.length === 0 && (
            <div style={{gridColumn:'1/-1', textAlign:'center', color:'var(--text-3)', fontSize:'0.6rem', letterSpacing:'2px', textTransform:'uppercase', padding:'32px'}}>Loading lyrics…</div>
          )}
          {liveCards.map((post) => (
            <a key={post.id} href={`/lyric-back?postId=${post.id}`} style={{
              display:'block',
              background:'var(--surface)',
              border:'1px solid var(--border)',
              borderRadius:'12px',
              padding:'20px',
              textDecoration:'none',
              transition:'all 150ms ease',
            }}>
              <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', paddingBottom:'16px', borderBottom:'1px solid var(--border)'}}>
                <div style={{
                  width:'36px', height:'36px', borderRadius:'50%',
                  background:'var(--gold)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <span style={{fontSize:'0.6rem', fontWeight:700, color:'var(--bg)', fontFamily:'var(--font-lora),serif'}}>
                    {(post.username || 'AN').slice(0,2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style={{fontSize:'0.7rem', color:'var(--text)', fontFamily:'var(--font-lora),serif', fontWeight:600}}>{post.username || 'Anonymous'}</div>
                  <div style={{fontSize:'0.6rem', color:'var(--text-3)', fontFamily:'var(--font-lora),serif'}}>{timeAgo(post.timestamp)}</div>
                </div>
              </div>
              <div style={{fontSize:'0.6rem', color:'var(--gold)', fontFamily:'var(--font-lora),serif', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'8px'}}>{post.emotion || 'Feeling'}</div>
              <p style={{fontFamily:'var(--font-lora),serif', fontStyle:'italic', fontSize:'0.95rem', color:'var(--text)', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                &quot;{post.text}&quot;
              </p>
              {post.knowledge?.artist && (
                <p style={{fontFamily:'var(--font-lora),serif', fontSize:'0.6rem', color:'var(--text-3)', marginTop:'12px', letterSpacing:'0.5px'}}>
                  {post.knowledge.artist}{post.knowledge.song ? ` · ${post.knowledge.song}` : ''}
                </p>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{height:'1px', background:'linear-gradient(to right, transparent, var(--border), transparent)', margin:'32px 0'}} />

      {/* Stats */}
      <section style={{position:'relative', zIndex:5, maxWidth:'80rem', margin:'0 auto', padding:'0 24px 48px'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0'}}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{
              display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
              padding:'32px 16px',
              borderRight: idx % 3 !== 2 ? '1px solid var(--border)' : 'none',
              borderBottom: idx < 3 ? '1px solid var(--border)' : 'none',
            }}>
              {stat.number ? (
                <div style={{fontFamily:'var(--font-lora),serif', fontSize:'2rem', fontWeight:700, color:'var(--text)', lineHeight:1, marginBottom:'8px'}}>{stat.number}</div>
              ) : (
                <div style={{fontFamily:'var(--font-lora),serif', fontSize:'1.1rem', fontWeight:700, color:'var(--gold)', lineHeight:1, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px'}}>{stat.value}</div>
              )}
              <div style={{fontFamily:'var(--font-lora),serif', fontSize:'0.6rem', fontWeight:700, color:'var(--text-3)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'4px'}}>{stat.label}</div>
              <div style={{fontFamily:'var(--font-lora),serif', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.5px'}}>{stat.context}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position:'relative', zIndex:10,
        borderTop:'1px solid var(--border)',
        padding:'24px 40px',
        display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'16px',
      }}>
        <MargoLogo tier="symbol" size={20} wordmark />
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
