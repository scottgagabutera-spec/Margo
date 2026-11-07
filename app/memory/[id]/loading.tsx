export default function MemoryDetailLoading() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: 'calc(var(--nav-height, 72px) + 12px) 20px var(--margo-page-padding-bottom)', maxWidth: 1120, margin: '0 auto' }}>
      <div
        className="margo-skeleton-pulse"
        style={{
          width: '100%',
          maxWidth: 420,
          aspectRatio: '4/5',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          marginBottom: 16,
        }}
      />
      <div style={{ height: 14, width: '62%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 10 }} />
      <div style={{ height: 12, width: '88%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
      <div style={{ height: 12, width: '72%', borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
      <style>{`
        @keyframes margoSkeletonPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.75; } }
        .margo-skeleton-pulse { animation: margoSkeletonPulse 1.4s ease-in-out infinite; }
      `}</style>
    </main>
  )
}
