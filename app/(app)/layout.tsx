import { AppSidebar } from "@/components/byred/sidebar"
import { AppTopbar } from "@/components/byred/topbar"
import { UserProvider } from "@/lib/context/user-context"
import { SidebarProvider } from "@/lib/context/sidebar-context"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppLayoutClient } from "./layout-client"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <UserProvider user={user}>
      <SidebarProvider>
        <div className="os-readable contents">
          {/* Sidebar is fixed-position — lives outside the content flow */}
          <AppSidebar />
          <AppLayoutClient>
            <AppTopbar />
            <main className="flex-1 pt-14 px-6 py-6 min-h-screen bg-[#09090B] text-[var(--text-primary)]">
              {children}
            </main>
          </AppLayoutClient>
        </div>
      </SidebarProvider>
    </UserProvider>
  )
}
