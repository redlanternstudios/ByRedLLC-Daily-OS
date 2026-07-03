import { useCallback, useRef } from "react"

interface ToastNotification {
  id: string
  message: string
  type: "success" | "error" | "info" | "warning"
  timestamp: number
}

const DEDUP_THROTTLE_MS = 3000 // Only show same toast once per 3 seconds

export function useToastDedup() {
  const recentToastsRef = useRef<Map<string, number>>(new Map())

  const canShowToast = useCallback((message: string, type: string): boolean => {
    const key = `${type}:${message}`
    const now = Date.now()
    const lastShown = recentToastsRef.current.get(key)

    if (lastShown && now - lastShown < DEDUP_THROTTLE_MS) {
      return false
    }

    recentToastsRef.current.set(key, now)

    // Cleanup old entries (older than 10 seconds)
    for (const [k, v] of recentToastsRef.current.entries()) {
      if (now - v > 10000) {
        recentToastsRef.current.delete(k)
      }
    }

    return true
  }, [])

  return { canShowToast }
}

/**
 * Global toast queue to prevent spam
 * Usage: singleton pattern for app-wide dedup
 */
class ToastQueue {
  private recentToasts = new Map<string, number>()
  private static instance: ToastQueue

  static getInstance(): ToastQueue {
    if (!ToastQueue.instance) {
      ToastQueue.instance = new ToastQueue()
    }
    return ToastQueue.instance
  }

  canShow(message: string, type: string): boolean {
    const key = `${type}:${message}`
    const now = Date.now()
    const lastShown = this.recentToasts.get(key)

    if (lastShown && now - lastShown < DEDUP_THROTTLE_MS) {
      return false
    }

    this.recentToasts.set(key, now)

    // Cleanup old entries
    for (const [k, v] of this.recentToasts.entries()) {
      if (now - v > 10000) {
        this.recentToasts.delete(k)
      }
    }

    return true
  }

  reset(): void {
    this.recentToasts.clear()
  }
}

export { ToastQueue }
