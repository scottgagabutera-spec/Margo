import Link from 'next/link'

function HelpMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.9.5-1.4 1.2-1.4 2.2V15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="18.25" r="1" fill="currentColor" />
    </svg>
  )
}

export function HelpCenterEntryLink({ className }: { className?: string }) {
  return (
    <Link
      href="/help"
      className={`margo-help-entry-link${className ? ` ${className}` : ''}`}
      aria-label="Help center"
    >
      <HelpMarkIcon />
    </Link>
  )
}
