// Direct-answer block (CONTENT-01 / D-16, D-17, D-18, D-19). Server Component —
// no client directive. Opens a key page with a single self-contained factual
// paragraph BEFORE any marketing copy, and carries the page's one <h1> (D-19).
// The prose is real, visible, and in the accessibility tree (D-18) so AI answer
// engines can extract and cite it. At most one inline link, no CTA button chrome
// (D-16). Visual tokens match PageHeader (sand band, espresso h1, mocha prose).
export function AnswerBlock({
  heading,
  text,
  link,
}: {
  heading: string;
  text: string;
  link?: { href: string; label: string };
}) {
  return (
    <section className="bg-sand">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <h1 className="text-4xl text-espresso md:text-6xl">{heading}</h1>
        <p className="mt-6 max-w-2xl leading-relaxed text-mocha">
          {text}
          {link ? (
            <>
              {" "}
              <a
                href={link.href}
                className="text-tan underline underline-offset-2 hover:text-espresso"
              >
                {link.label}
              </a>
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}
