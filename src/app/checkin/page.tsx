import { redirect } from "next/navigation";

// Standalone check-in kiosk route is not part of Pure Nail Bar; redirect home.
export default function CheckinPage() {
  redirect("/en");
}
