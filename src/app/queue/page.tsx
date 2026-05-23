import { redirect } from "next/navigation";

// Standalone technician-queue kiosk route — redirect home.
export default function QueuePage() {
  redirect("/en");
}
