import { MARGO_SEARCH_HINT_CATALOG } from '@/lib/margo-search-hints'

/**
 * Server-rendered Stage idle hero (wordmark, tagline, search field shell).
 * Client StageLanding hydrates search behavior on the same landmark structure.
 */
export function StageLandingSsrHero() {
  return (
    <section className="margo-stage-hero margo-stage-hero--ssr" aria-label="Margo expression home">
      <div className="margo-stage-hero__intro">
        <div className="margo-stage-hero__wordmark-wrap">
          <span className="margo-stage-hero__wordmark">MARGO</span>
        </div>
        <p className="margo-stage-hero__tagline">
          Expression through a line of music.
        </p>
      </div>
      <div className="margo-stage-hero-search">
        <div className="margo-search-wrap margo-search-wrap--standard">
          <input
            className="margo-search"
            type="search"
            name="margo-stage-search"
            readOnly
            tabIndex={-1}
            aria-hidden
            placeholder={MARGO_SEARCH_HINT_CATALOG}
          />
        </div>
      </div>
    </section>
  )
}
