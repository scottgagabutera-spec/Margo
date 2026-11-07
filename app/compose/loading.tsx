import { FeedPostSkeletonList } from '@/components/margo-skeletons'

export default function ComposeLoading() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: 'calc(var(--nav-height, 72px) + 8px) 16px var(--margo-page-padding-bottom)', maxWidth: 720, margin: '0 auto' }}>
      <FeedPostSkeletonList count={2} />
    </main>
  )
}
