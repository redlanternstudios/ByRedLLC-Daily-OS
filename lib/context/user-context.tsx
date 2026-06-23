"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { ByredUser, ByredTenant } from "@/types/database"
import type { User } from "@supabase/supabase-js"

// A directory entry: another active user in the org
export type DirectoryEntry = {
  id: string
  name: string
  email: string
  role: string
  avatar_url?: string | null
}

// Serializable — safe to pass from Server Component to UserProvider prop
export type SerializedUser = {
  authUser: User
  profile: ByredUser | null
  tenants: Array<ByredTenant & {
    role: string
  }>
  isAdmin: boolean
  activeTenantId: string | null
  directory: DirectoryEntry[]
}

// Full client-side type — includes the setter function, lives only in context
export type CurrentUser = SerializedUser & {
  setActiveTenantId: (id: string) => void
}

const UserContext = createContext<CurrentUser | null>(null)

export function UserProvider({
  children,
  user,
}: {
  children: ReactNode
  user: SerializedUser | null
}) {
  const defaultTenantId = user?.tenants?.[0]?.id ?? null
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(defaultTenantId)

  const setActiveTenantId = useCallback((id: string) => {
    setActiveTenantIdState(id)
  }, [])

  const value: CurrentUser | null = user
    ? {
        ...user,
        activeTenantId,
        setActiveTenantId,
      }
    : null

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

export function useRequiredUser() {
  const user = useUser()
  if (!user) {
    throw new Error("User is required but not found in context")
  }
  return user
}

// Convenience: just the active tenant object
export function useActiveTenant() {
  const user = useUser()
  if (!user || !user.activeTenantId) return null
  return user.tenants.find((t) => t.id === user.activeTenantId) ?? null
}
