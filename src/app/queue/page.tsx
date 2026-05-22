import { redirect } from "next/navigation";

// Standalone technician-queue kiosk route is not part of Pure Nail Bar.
export default function QueuePage() {
  redirect("/en");
}
