import type { HelpTopicIconId } from '@/lib/help-center/content'

const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }

export function HelpTopicIcon({ id }: { id: HelpTopicIconId }) {
  switch (id) {
    case 'compass':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
          <path d="m14.5 9.5-3 6 6-3-3-3z" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'pencil':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
        </svg>
      )
    case 'memories':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
          <path d="M4 16l4-4 3 3 5-6 4 5" />
        </svg>
      )
    case 'discover':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14a8 8 0 1 1 8-8" />
          <path d="M4 10V4h6" />
        </svg>
      )
    case 'messages':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8h12v10H6z" />
          <path d="M9 8V6a3 3 0 0 1 3-3h4v5" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      )
    case 'studio':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18V6l8-3 8 3v12l-8 3-8-3z" />
        </svg>
      )
    case 'upload':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V6" />
          <path d="m8 10 4-4 4 4" />
          <path d="M5 18h14" />
        </svg>
      )
    case 'lyrics':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M6 6h12M6 10h10M6 14h12M6 18h8" />
        </svg>
      )
    case 'promote':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14l6-8 4 5 6-9v16H4z" />
        </svg>
      )
    case 'copyright':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M14 9.5a3.5 3.5 0 1 0 0 5" />
        </svg>
      )
    default:
      return null
  }
}
