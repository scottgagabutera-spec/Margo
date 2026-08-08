/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Old browse/discovery page — permanent, since /music never comes back.
      {
        source: '/music',
        destination: '/discover',
        permanent: true,
      },
      // Old query-param player route — /music/player?id=X (with or without
      // &au=) now permanently redirects to the canonical /song/[id] route.
      // Next.js redirects() supports forwarding a named query param into
      // the destination path via `has`.
      {
        source: '/music/player',
        has: [{ type: 'query', key: 'id', value: '(?<id>.*)' }],
        destination: '/song/:id',
        permanent: true,
      },
      // Fallback: /music/player hit with no id at all — send to Discover
      // rather than a broken /song/undefined.
      {
        source: '/music/player',
        destination: '/discover',
        permanent: true,
      },
      // Alias for Copyright Policy / DMCA designated-agent page.
      {
        source: '/copyright-policy',
        destination: '/dmca',
        permanent: true,
      },
      // Stale static privacy copy (public/privacy.html) — App Router
      // /privacy is the only live policy surface.
      {
        source: '/privacy.html',
        destination: '/privacy',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
