export default function PostThreadLoading() {
  return (
    <main
      className="margo-post-thread-loading"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: 'calc(var(--nav-height, 72px) + 24px) 20px var(--margo-page-padding-bottom)',
        maxWidth: '640px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
      aria-busy="true"
      aria-label="Loading post"
    >
      <div
        style={{
          height: '14px',
          width: '42%',
          borderRadius: '6px',
          background: 'var(--surface-2)',
          marginBottom: '20px',
        }}
      />
      <div
        style={{
          height: '72px',
          borderRadius: '16px',
          background: 'var(--surface-2)',
          marginBottom: '16px',
        }}
      />
      <div
        style={{
          height: '120px',
          borderRadius: '16px',
          background: 'var(--surface-2)',
        }}
      />
    </main>
  )
}
