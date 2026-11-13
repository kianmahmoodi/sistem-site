import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type Props = {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
};

export function LegalPage({ title, updated, sections }: Props) {
  return (
    <main id="main" className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand">
          <ArrowLeft className="size-4" /> Back to home
        </Link>
        <h1 className="mt-5 text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-bold">{section.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
