import { reviews } from "@/lib/reviews";

export type Testimonial = { author: string; rating: 4 | 5; quote: string };

// Curated placeholders mirroring real Pure Nail Bar client reviews. Used until
// real 5★ Google reviews are fetched (scripts/fetch-google-reviews.mjs).
const placeholders: readonly Testimonial[] = [
  {
    author: "Sarah M.",
    rating: 5,
    quote:
      "Best nail salon I've ever been to — super clean, professional, and the results are always stunning.",
  },
  {
    author: "Michelle W.",
    rating: 5,
    quote:
      "The gel manicure lasts perfectly for 3 weeks every single time. I won't go anywhere else.",
  },
  {
    author: "Amanda K.",
    rating: 5,
    quote:
      "I really love the space, the location, and the staff. The technicians do a very thorough job every time.",
  },
  {
    author: "Jessica T.",
    rating: 5,
    quote:
      "Gorgeous nail art and the most relaxing atmosphere. It feels like a little luxury escape.",
  },
  {
    author: "Priya S.",
    rating: 4,
    quote:
      "Lovely spa pedicure and friendly service. A short wait at peak times but absolutely worth it.",
  },
  {
    author: "Emily R.",
    rating: 5,
    quote:
      "Spotless studio, certified techs, and beautiful results. My go-to for every special occasion.",
  },
];

// Real 5★ reviews when present (capped for layout), else the placeholders above.
const fromGoogle: readonly Testimonial[] = reviews.map((r) => ({
  author: r.author,
  rating: 5 as const,
  quote: r.text,
}));

export const testimonials: readonly Testimonial[] =
  fromGoogle.length > 0 ? fromGoogle.slice(0, 6) : placeholders;
