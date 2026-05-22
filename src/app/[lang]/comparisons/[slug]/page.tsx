import { notFound } from "next/navigation";

// Comparison pages were removed for the Pure Nail Bar clone. The route segment
// remains (file deletion is gated in this environment); it pre-renders nothing
// and always 404s.
export function generateStaticParams(): { slug: string }[] {
  return [];
}

export default function RemovedComparisonPage() {
  notFound();
}
