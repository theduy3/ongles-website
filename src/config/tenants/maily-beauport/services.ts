// maily-beauport services + pricing. Verbatim from the legacy src/lib/services.ts.
import type { Service } from "@/config/types";

export const services: readonly Service[] = [
  { id: "pose-ongles", slug: { fr: "pose-d-ongles", en: "nail-enhancements" }, price: 60, priceTo: 75, photo: true },
  { id: "remplissage", slug: { fr: "remplissage", en: "fill" }, price: 45, priceTo: 60, photo: true },
  { id: "soins-mains", slug: { fr: "soins-des-mains", en: "manicure" }, price: 30, priceTo: 40, photo: true },
  { id: "soins-pieds", slug: { fr: "soins-des-pieds", en: "pedicure" }, price: 35, priceTo: 60, photo: true },
];
