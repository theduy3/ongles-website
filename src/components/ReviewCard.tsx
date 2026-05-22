import { Stars } from "@/components/Stars";
import type { Review } from "@/lib/reviews";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="flex h-full flex-col gap-4 bg-cream p-6">
      <Stars className="text-espresso" />
      <span className="sr-only">{review.rating} / 5</span>
      <blockquote className="flex-1 leading-relaxed text-mocha">
        {review.text}
      </blockquote>
      <figcaption className="text-sm uppercase tracking-wide text-tan">
        {review.author}
      </figcaption>
    </figure>
  );
}
