import { redirect } from "next/navigation"

export default function HomePage() {
  // Root route redirects to login; authenticated users will be sent to dashboard by middleware
  redirect("/login")
}
