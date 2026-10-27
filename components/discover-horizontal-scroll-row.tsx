'use client'

import { useRef, type ReactNode } from 'react'
import { ChevronRightIcon } from '@/components/icons'
import { ArrowLeftIcon } from '@/components/icons'

export function DiscoverHorizontalScrollRow({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const nudge = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const step = Math.max(200, Math.floor(el.clientWidth * 0.75))
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div className="discover-hscroll-outer">
      <style>{`
        .discover-hscroll-outer {
          position: relative;
          min-width: 0;
        }
        .discover-hscroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x proximity;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .discover-hscroll::-webkit-scrollbar { display: none; }
        .discover-hscroll-nav {
          display: none;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-hi);
          background: rgba(7, 6, 10, 0.88);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        @media (hover: hover) and (pointer: fine) {
          .discover-hscroll-outer:hover .discover-hscroll-nav { display: flex; }
        }
        .discover-hscroll-nav--left { left: -4px; }
        .discover-hscroll-nav--right { right: -4px; }
      `}</style>
      <button
        type="button"
        className="discover-hscroll-nav discover-hscroll-nav--left"
        aria-label="Scroll row left"
        onClick={() => nudge(-1)}
      >
        <ArrowLeftIcon size={16} color="var(--gold)" />
      </button>
      <div ref={scrollerRef} className="discover-hscroll" data-discover-hscroll>
        {children}
      </div>
      <button
        type="button"
        className="discover-hscroll-nav discover-hscroll-nav--right"
        aria-label="Scroll row right"
        onClick={() => nudge(1)}
      >
        <ChevronRightIcon size={16} color="var(--gold)" />
      </button>
    </div>
  )
}
