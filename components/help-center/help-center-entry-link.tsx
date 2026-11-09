import Link from 'next/link'

export function HelpCenterEntryLink({ className }: { className?: string }) {
  return (
    <Link
      href="/help"
      className={`margo-help-entry-link${className ? ` ${className}` : ''}`}
      aria-label="Help center"
    >
      <span aria-hidden>?</span>
    </Link>
  )
}
