import { redirect } from "next/navigation";

// Standalone check-in kiosk route — redirect home.
export default function CheckinPage() {
  redirect("/en");
}
