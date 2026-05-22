"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";

// Hydration gate: false on the server / first client paint, true once hydrated.
// useSyncExternalStore is the React-idiomatic way to read this without a
// setState-in-effect (its server snapshot differs from the client snapshot).
const noopSubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

// Scroll-triggered fade-up. Reproduces the original site's on-scroll reveal feel.
//
// Progressive enhancement: the server (and any no-JS / pre-hydration / crawler
// render) outputs the content fully visible. Only after the component mounts on
// the client — proving JS is alive to drive the IntersectionObserver — do we
// opt into the hidden-then-reveal animation. This prevents the page-middle from
// being stranded at opacity:0 when JS never runs. We also bow out entirely when
// the user prefers reduced motion.
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const mounted = useHydrated();
  const prefersReducedMotion = useReducedMotion();

  if (!mounted || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
