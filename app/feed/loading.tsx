import { FeedPageSkeleton } from '@/components/margo-skeletons'

export default function FeedLoading() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'var(--nav-height, 72px)' }}>
      <FeedPageSkeleton count={3} />
    </main>
  )
}
