'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  articlesForTopic,
  getTopic,
} from '@/lib/help-center/content'
import { HelpContentPageShell } from '@/components/help-center/help-content-page-shell'

export function HelpCenterTopic({ topicId }: { topicId: string }) {
  const topic = getTopic(topicId)
  if (!topic) notFound()
  const articles = articlesForTopic(topicId)

  return (
    <HelpContentPageShell title={topic.title}>
      <p className="margo-content-page__intro">{topic.subtitle}</p>
      {articles.length === 0 ? (
        <p className="margo-content-page__muted">Articles for this topic are coming soon.</p>
      ) : (
        <ul className="margo-help-article-list margo-help-article-list--topic">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/help/${topicId}/${a.id}`} className="margo-help-article-list__link">
                {a.title}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HelpContentPageShell>
  )
}
