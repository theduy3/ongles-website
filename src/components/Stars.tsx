// Row of 5 filled stars. Decorative (aria-hidden) — a numeric score beside it
// carries the real value for assistive tech.
export function Stars({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-1 ${className}`} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 7.1-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}
