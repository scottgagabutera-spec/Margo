export default function RootLoading() {
  return (
    <main
      className="margo-landing-page-shell"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
      }}
    >
      <div style={{ width: 200, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }} />
      <div style={{ width: 'min(320px, 88vw)', height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
      <style>{`
        @keyframes margoSkeletonPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.75; } }
        main > div { animation: margoSkeletonPulse 1.4s ease-in-out infinite; }
      `}</style>
    </main>
  )
}
