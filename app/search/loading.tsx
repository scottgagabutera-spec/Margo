import { SearchRowSkeletonList } from '@/components/margo-skeletons'

export default function SearchLoading() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: 'calc(var(--nav-height, 72px) + 12px) 16px var(--margo-page-padding-bottom)' }}>
      <SearchRowSkeletonList count={6} />
    </main>
  )
}
