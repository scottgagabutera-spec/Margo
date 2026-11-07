import { FeedPostSkeletonList } from '@/components/margo-skeletons'

export default function FeedLoading() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div
        style={{
          maxWidth: 'var(--margo-feed-max-width, 720px)',
          margin: '0 auto',
          paddingTop: 'calc(var(--nav-height, 72px) + 12px)',
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 'var(--margo-page-padding-bottom)',
        }}
      >
        <FeedPostSkeletonList count={3} />
      </div>
    </main>
  )
}
