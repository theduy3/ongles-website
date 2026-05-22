import { Reveal } from "./Reveal";

// Shared soft-gray title band used by every inner route. Server Component.
export function PageHeader({
  title,
  intro,
}: {
  title: string;
  intro?: string;
}) {
  return (
    <section className="bg-fog">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <Reveal>
          <h1 className="text-4xl md:text-6xl">{title}</h1>
          {intro && (
            <p className="mt-6 max-w-2xl leading-relaxed text-mocha">{intro}</p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
