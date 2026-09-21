// Direct-answer block (CONTENT-01 / D-16, D-17, D-18, D-19). Server Component —
// no client directive. A visible, self-contained factual block whose caller
// controls placement and heading level; it defaults to H1 for backward
// compatibility. The prose is real, visible, and in the accessibility tree
// (D-18) so AI answer engines can extract and cite it. At most one inline link,
// no CTA button chrome (D-16). Visual tokens match PageHeader (sand band,
// espresso heading, mocha prose). `compact` changes visual weight only.
type AnswerBlockProps = {
  heading: string;
  text: string;
  link?: { href: string; label: string };
  compact?: boolean;
  headingLevel?: "h1" | "h2";
};

export function AnswerBlock({
  heading,
  text,
  link,
  compact = false,
  headingLevel = "h1",
}: AnswerBlockProps) {
  const HeadingTag: "h1" | "h2" = headingLevel;

  return (
    <section className="bg-sand">
      <div
        className={`mx-auto max-w-6xl px-6 ${compact ? "py-8 md:py-10" : "py-16 md:py-24"}`}
      >
        <HeadingTag
          className={`text-espresso ${compact ? "text-2xl md:text-3xl" : "text-4xl md:text-6xl"}`}
        >
          {heading}
        </HeadingTag>
        <p
          className={`max-w-2xl leading-relaxed text-mocha ${compact ? "mt-3" : "mt-6"}`}
        >
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
