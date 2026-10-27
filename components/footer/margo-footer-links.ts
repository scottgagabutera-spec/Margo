export type MargoFooterLink = {
  label: string
  href: string
}

export type MargoFooterSection = {
  id: 'margo' | 'legal'
  label: string
  links: readonly MargoFooterLink[]
}

export const MARGO_FOOTER_SECTIONS: readonly MargoFooterSection[] = [
  {
    id: 'margo',
    label: 'MARGO',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Help Center', href: '/help' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    id: 'legal',
    label: 'LEGAL',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'DMCA', href: '/dmca' },
      { label: 'Data deletion', href: '/data-deletion' },
    ],
  },
] as const

export const MARGO_FOOTER_SHEET_LINK_HREFS: readonly string[] = MARGO_FOOTER_SECTIONS.flatMap(
  (s) => s.links.map((l) => l.href),
)
