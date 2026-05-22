import { redirect } from "next/navigation";
import { isLocale, type LangParams } from "@/lib/i18n";

// Legacy /appointments route → canonical /book-online (the file could not be
// deleted in this environment, so it permanently redirects instead).
export default async function AppointmentsRedirect({ params }: LangParams) {
  const { lang } = await params;
  redirect(isLocale(lang) ? `/${lang}/book-online` : "/en/book-online");
}
