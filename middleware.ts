import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
  response.headers.set("x-request-id", requestId)
  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
