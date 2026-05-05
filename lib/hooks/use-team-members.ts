"use client"

import { useUser } from "@/lib/context/user-context"
import type { MentionUser } from "@/components/byred/mention-textarea"

// Returns team members from the already-loaded UserContext (no extra fetch)
export function useTeamMembers(): MentionUser[] {
  const user = useUser()
  return user?.directory ?? []
}
