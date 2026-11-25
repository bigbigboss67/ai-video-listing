import React from 'react';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LEGAL_DOCUMENTS, type LegalBlock, type LegalDocument } from '@/content/legal';
import { LEGAL_PAGES_PENDING_LAWYER_REVIEW } from '@/lib/legal';
import { formatDate } from '@/lib/format';

const PLACEHOLDER_SPLIT = /(\[[^\]]+\])/g;
const IS_PLACEHOLDER = /^\[[^\]]+\]$/;

/** Highlights "[...]" placeholders and unconfirmed guesses so they cannot be missed. */
function RichText({ text }: { text: string }) {
  const parts = text.split(PLACEHOLDER_SPLIT);
  return (
    <>
      {parts.map((part, i) =>
        IS_PLACEHOLDER.test(part) ? (
          <mark
            key={i}
            data-legal-placeholder
            className="px-1 rounded-[3px] bg-[var(--status-warn-bg)] text-[var(--status-warn)] font-medium"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === 'p') {
    return (
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        <RichText text={block.text} />
      </p>
    );
  }
  if (block.type === 'ul') {
    return (
      <ul className="list-disc ps-5 space-y-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
        {block.items.map((item, i) => (
          <li key={i}>
            <RichText text={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[6px] border border-[var(--border-subtle)]">
      <table className="w-full min-w-[540px] text-sm text-start">
        <thead className="bg-[var(--bg-elevated)]">
          <tr>
            {block.headers.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-start font-semibold text-xs">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri} className="border-t border-[var(--border-subtle)] align-top">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-[var(--text-secondary)]">
                  <RichText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function LegalDocumentView({
  document,
  locale,
}: {
  document: LegalDocument;
  locale: 'en' | 'ar';
}) {
  const t = await getTranslations('legal');
  const content = document[locale];
  const others = Object.values(LEGAL_DOCUMENTS).filter((d) => d.slug !== document.slug);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {LEGAL_PAGES_PENDING_LAWYER_REVIEW ? (
        <div
          role="note"
          data-testid="legal-draft-banner"
          className="mb-6 flex gap-2.5 p-3.5 rounded-[6px] border border-[var(--status-warn)]/40 bg-[var(--status-warn-bg)] text-[var(--status-warn)] text-xs leading-relaxed"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span>{t('draftBanner')}</span>
        </div>
      ) : null}

      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{content.title}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{content.summary}</p>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {t('lastUpdated')}: {formatDate(document.lastUpdated, locale)} · {t('version')}:{' '}
          <span className="bidi-ltr font-mono">{document.version}</span>
        </p>
      </header>

      <nav aria-label={t('contents')} className="mb-8 p-4 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
          {t('contents')}
        </h2>
        <ol className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {content.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-[var(--accent-primary)] hover:underline">
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-8">
        {content.sections.map((section) => {
          const note = LEGAL_PAGES_PENDING_LAWYER_REVIEW ? document.review[section.id] : undefined;
          return (
            <section key={section.id} id={section.id} className="scroll-mt-20 space-y-3">
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
              {note ? (
                <aside
                  data-testid="legal-review-note"
                  dir="ltr"
                  lang="en"
                  className="p-3 rounded-[6px] border border-dashed border-[var(--status-warn)]/50 text-xs leading-relaxed text-[var(--text-secondary)] text-left"
                >
                  <strong className="text-[var(--status-warn)]">{t('reviewNote')}: </strong>
                  {note}
                </aside>
              ) : null}
            </section>
          );
        })}
      </div>

      <footer className="mt-12 pt-6 border-t border-[var(--border-subtle)]">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
          {t('otherDocs')}
        </h2>
        <ul className="flex flex-wrap gap-4 text-sm">
          {others.map((d) => (
            <li key={d.slug}>
              <Link href={`/legal/${d.slug}`} className="text-[var(--accent-primary)] hover:underline">
                {d[locale].title}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}
