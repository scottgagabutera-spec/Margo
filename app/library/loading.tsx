import { SearchRowSkeletonList } from '@/components/margo-skeletons'

export default function LibraryLoading() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: 'calc(var(--nav-height, 72px) + 12px) 16px var(--margo-page-padding-bottom)', maxWidth: 720, margin: '0 auto' }}>
      <SearchRowSkeletonList count={5} />
    </main>
  )
}
