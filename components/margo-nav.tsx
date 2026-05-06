'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function MargoNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          className="text-2xl font-serif italic text-amber-400 tracking-tight hover:text-amber-300 transition-colors"
        >
          Margo
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/feed"
            className={cn(
              "text-sm font-medium transition-colors",
              pathname === '/feed' 
                ? "text-amber-400" 
                : "text-white/60 hover:text-white"
            )}
          >
            Feed
          </Link>
          <Link
            href="/music"
            className={cn(
              "text-sm font-medium transition-colors",
              pathname?.startsWith('/music') 
                ? "text-amber-400" 
                : "text-white/60 hover:text-white"
            )}
          >
            Music
          </Link>
          <Link
            href="/compose"
            className={cn(
              "text-sm font-medium transition-colors",
              pathname === '/compose' 
                ? "text-amber-400" 
                : "text-white/60 hover:text-white"
            )}
          >
            Compose
          </Link>
          <Link
            href="/lyric-back"
            className={cn(
              "text-sm font-medium transition-colors",
              pathname === '/lyric-back' 
                ? "text-amber-400" 
                : "text-white/60 hover:text-white"
            )}
          >
            Lyric Backs
          </Link>
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
    </nav>
  )
}
