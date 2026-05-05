"use client"

import { useState, useEffect } from "react"
import type { MentionUser } from "@/components/byred/mention-textarea"

let cache: MentionUser[] | null = null

export function useTeamMembers(): MentionUser[] {
  const [members, setMembers] = useState<MentionUser[]>(cache ?? [])

  useEffect(() => {
    if (cache) { setMembers(cache); return }
    fetch("/api/os/members")
      .then(r => r.json())
      .then((d: { members: MentionUser[] }) => {
        cache = d.members ?? []
        setMembers(cache)
      })
      .catch(() => {})
  }, [])

  return members
}
