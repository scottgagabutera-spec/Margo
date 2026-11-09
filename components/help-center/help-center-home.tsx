'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  HELP_HOME_SUBTITLE,
  POPULAR_QUESTIONS,
  type HelpAudience,
  searchArticles,
  topicsForAudience,
} from '@/lib/help-center/content'
import { HelpTopicIcon } from '@/components/help-center/help-topic-icons'
import { HelpCenterContactCard } from '@/components/help-center/help-content-page-shell'
import { HelpCenterFooter } from '@/components/help-center/help-center-footer'

export function HelpCenterHome() {
  const router = useRouter()
  const [audience, setAudience] = useState<HelpAudience>('members')
  const [query, setQuery] = useState('')
  const topics = topicsForAudience(audience)
  const results = useMemo(() => searchArticles(query, audience), [query, audience])

  return (
    <div className="margo-content-page">
      <div className="margo-content-page__inner">
        <header className="margo-content-page__header margo-content-page__header--home">
          <button
            type="button"
            className="margo-content-page__back"
            aria-label="Close help center"
            onClick={() => router.back()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
          <h1 className="margo-content-page__title">Help center</h1>
          <p className="margo-content-page__date">{HELP_HOME_SUBTITLE}</p>
        </header>

        <div className="margo-help-search-wrap">
          <span className="margo-help-search__icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            className="margo-help-search"
            placeholder="Search help"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search help"
          />
        </div>

        <div className="margo-help-audience" role="tablist" aria-label="Help audience">
          {(['members', 'artists'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={audience === id}
              className={`margo-help-audience__tab${audience === id ? ' margo-help-audience__tab--active' : ''}`}
              onClick={() => setAudience(id)}
            >
              {id === 'members' ? 'Members' : 'Artists'}
            </button>
          ))}
        </div>

        {query.trim() ? (
          <div className="margo-help-search-results">
            {results.length === 0 ? (
              <p className="margo-content-page__muted">No articles match your search.</p>
            ) : (
              <ul className="margo-help-article-list">
                {results.map((a) => (
                  <li key={a.id}>
                    <Link href={`/help/${a.topicId}/${a.id}`} className="margo-help-article-list__link">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="margo-help-topic-grid">
              {topics.map((topic) => (
                <Link key={topic.id} href={`/help/${topic.id}`} className="margo-help-topic-card">
                  <span className="margo-help-gold-square margo-help-topic-card__icon">
                    <HelpTopicIcon id={topic.icon} />
                  </span>
                  <span className="margo-help-topic-card__title">{topic.title}</span>
                  <span className="margo-help-topic-card__sub">{topic.subtitle}</span>
                </Link>
              ))}
            </div>

            {audience === 'members' ? (
              <section className="margo-help-popular">
                <h2 className="margo-content-page__section-title">Popular</h2>
                <ul className="margo-help-popular__list">
                  {POPULAR_QUESTIONS.map((q) => (
                    <li key={q.href}>
                      <Link href={q.href} className="margo-help-popular__row">
                        <span>{q.label}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}

        <HelpCenterContactCard />
        <HelpCenterFooter />
      </div>
    </div>
  )
}
