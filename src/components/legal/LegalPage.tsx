import type { ReactNode } from "react";
import { REPO_URL, contactEmail } from "@/lib/site";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** How to reach us: the configured contact email, or the project page until one is set. */
export function Contact() {
  const email = contactEmail();
  return email ? (
    <a href={`mailto:${email}`} className="text-cyan underline-offset-2 hover:underline">
      {email}
    </a>
  ) : (
    <a href={REPO_URL} className="text-cyan underline-offset-2 hover:underline">
      the ThesisBreaker project page
    </a>
  );
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="metal-text">{title}</span>
      </h1>
      <p className="num mt-3 text-xs text-muted">Last updated: {updated}</p>
      <p className="mt-5 text-[15px] leading-relaxed text-ink/85">{intro}</p>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="chip">
            {s.title}
          </a>
        ))}
      </nav>
      <div className="mt-8 space-y-5">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="glass scroll-mt-32 p-6 sm:p-8" aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`} className="text-xl font-semibold">
              {s.title}
            </h2>
            <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/85 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:space-y-2">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
