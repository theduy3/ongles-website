import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "solid" | "light" | "outline" | "ghost";

const variants: Record<Variant, string> = {
  solid: "bg-espresso text-cream hover:bg-mocha",
  light: "bg-cream text-espresso hover:bg-tan",
  outline:
    "border border-current text-espresso hover:bg-espresso hover:text-cream",
  // Transparent pill with a hairline border — the live "Call to Book" style.
  ghost:
    "border border-espresso/20 bg-transparent text-mocha hover:border-espresso hover:text-espresso",
};

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

// Renders an external <a> for http(s) and tel:/mailto: links, and a prefetching
// next/link for internal routes. Pill shape (50px) per the brand system.
export function Button({
  href,
  children,
  variant = "solid",
  className = "",
}: Props) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-pill px-9 py-3.5 text-sm font-medium uppercase tracking-wide transition-colors ${variants[variant]} ${className}`;

  const isHttp = /^https?:\/\//.test(href);
  const isExternalScheme = /^(tel:|mailto:)/.test(href);

  if (isHttp || isExternalScheme) {
    return (
      <a
        href={href}
        {...(isHttp ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
