"use client"

import { useState } from "react"
import { Copy, Check, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Small Copy + Share control for comments, tasks, and other shareable content.
 * Copy → clipboard. Share → native share sheet if available, else copies the link.
 */
export function CopyShare({
  text,
  shareUrl,
  shareTitle = "By Red OS",
  className,
  labels = true,
}: {
  text: string
  /** Relative or absolute URL to share; defaults to the current page. */
  shareUrl?: string
  shareTitle?: string
  className?: string
  labels?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  function absoluteUrl(): string {
    if (typeof window === "undefined") return shareUrl ?? ""
    if (!shareUrl) return window.location.href
    return shareUrl.startsWith("http") ? shareUrl : `${window.location.origin}${shareUrl}`
  }

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  async function doShare() {
    const url = absoluteUrl()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any
    if (nav?.share) {
      try { await nav.share({ title: shareTitle, text, url }) } catch { /* dismissed */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  const btn = "inline-flex items-center gap-1 text-[10px] text-[#9CA3AF] hover:text-white transition-colors"
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button type="button" onClick={doCopy} title="Copy" className={btn}>
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        {labels && <span>{copied ? "Copied" : "Copy"}</span>}
      </button>
      <button type="button" onClick={doShare} title="Share" className={btn}>
        {shared ? <Check className="w-3 h-3 text-green-400" /> : <Share2 className="w-3 h-3" />}
        {labels && <span>{shared ? "Link copied" : "Share"}</span>}
      </button>
    </div>
  )
}
