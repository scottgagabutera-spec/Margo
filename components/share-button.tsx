'use client'
import { useState } from 'react'
import { Share2 } from 'lucide-react'

interface ShareButtonProps {
  lyric: string
  postId?: string
  small?: boolean
}

export function ShareButton({ lyric, postId, small = false }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = postId ? `https://trymargo.com/lyric-back?postId=${postId}` : 'https://trymargo.com'
  const shareText = '"' + lyric.substring(0, 60) + '" — trymargo.com'
  const encoded = encodeURIComponent(url)
  const encodedText = encodeURIComponent(shareText)

  const handleClick = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'MARGO', text: shareText, url }); return } catch(e: any) { if (e.name === 'AbortError') return }
    }
    setIsOpen(prev => !prev)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); setIsOpen(false) }, 1500)
    } catch {}
  }

  return (
    <div className="relative inline-flex">
      <button
        onClick={handleClick}
        className={`flex flex-col items-center justify-center gap-${small ? '1' : '2'} text-amber-100/50 hover:text-amber-400 transition-all duration-300`}
        aria-label="Share"
      >
        <Share2 size={small ? 14 : 18} />
        {!small && <span className="text-[9px] font-medium tracking-widest uppercase">Share</span>}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full right-0 z-50 mb-2 min-w-[200px] rounded-xl border border-white/10 bg-[#1a1a1a] p-3 flex flex-col gap-2 shadow-2xl">
            <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 mb-1">Share via</div>
            <a href={`https://x.com/intent/tweet?url=${encoded}&text=${encodedText}`} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)} className="px-3 py-2.5 bg-white/5 hover:bg-amber-500/10 hover:text-amber-400 rounded-lg text-sm text-white/90 transition-colors">X / Twitter</a>
            <a href={`https://wa.me/?text=${encodedText}%20${encoded}`} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)} className="px-3 py-2.5 bg-white/5 hover:bg-amber-500/10 hover:text-amber-400 rounded-lg text-sm text-white/90 transition-colors">WhatsApp</a>
            <a href={`mailto:?subject=Lyric on MARGO&body=${encodedText}%0A%0A${encoded}`} onClick={() => setIsOpen(false)} className="px-3 py-2.5 bg-white/5 hover:bg-amber-500/10 hover:text-amber-400 rounded-lg text-sm text-white/90 transition-colors">Email</a>
            <div className="h-px bg-white/10 my-1" />
            <button onClick={handleCopy} className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg text-sm text-amber-400 text-left transition-colors">
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}