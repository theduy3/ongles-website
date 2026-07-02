// Shared Tailwind class strings for the admin settings + popup forms. One owner
// so a field's styling can't drift between sections, and so a new section (or
// the popup form) extends the shared look instead of importing it from a sibling
// component. Previously exported from BrandSeoSection and re-copied in PopupForm.
export const inputClass =
  "w-full rounded-lg border border-tan bg-beige px-3 py-2 text-sm outline-none focus:border-espresso";
export const labelClass = "flex flex-col gap-1 text-xs";
export const spanClass = "text-tan";
