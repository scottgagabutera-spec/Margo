import MargoLogo from '@/components/MargoLogo'
import { MargoFooter } from '@/components/footer/margo-footer'
import { LandingAccountNav } from '@/components/stage/landing-account-nav'
import { StageLandingClientRoot } from '@/components/stage/stage-landing-client-root'
import { StageLandingSsrHero } from '@/components/stage/stage-landing-ssr-hero'

export function StageLandingPage() {
  return (
    <div className="margo-landing-page-shell">
      <nav className="margo-landing-nav">
        <a href="/" style={{ display: 'inline-flex', overflow: 'visible', textDecoration: 'none' }}>
          <MargoLogo tier="lockup" size={36} rings glow={false} />
        </a>
        <LandingAccountNav />
      </nav>

      <div className="margo-landing-hero-anchor">
        <section className="margo-stage-zone">
          <StageLandingSsrHero />
          <StageLandingClientRoot />
        </section>
      </div>

      <MargoFooter />
    </div>
  )
}
