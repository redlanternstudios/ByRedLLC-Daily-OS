import { ToastQueue } from "./hooks/useToastDedup"

/**
 * Global toast notifications with automatic dedup/throttle
 * Prevents toast spam when the same message is triggered multiple times
 */

interface ToastOptions {
  duration?: number
  action?: { label: string; onClick: () => void }
}

let toastShowFn: ((message: string, type: string, options?: ToastOptions) => void) | null = null

/**
 * Register the toast display function (called by ToastProvider)
 */
export function registerToastProvider(
  showFn: (message: string, type: string, options?: ToastOptions) => void
) {
  toastShowFn = showFn
}

/**
 * Show a success toast (with dedup)
 */
export function showToastSuccess(message: string, options?: ToastOptions) {
  const queue = ToastQueue.getInstance()
  if (queue.canShow(message, "success") && toastShowFn) {
    toastShowFn(message, "success", options)
  }
}

/**
 * Show an error toast (with dedup)
 */
export function showToastError(message: string, options?: ToastOptions) {
  const queue = ToastQueue.getInstance()
  if (queue.canShow(message, "error") && toastShowFn) {
    toastShowFn(message, "error", options)
  }
}

/**
 * Show an info toast (with dedup)
 */
export function showToastInfo(message: string, options?: ToastOptions) {
  const queue = ToastQueue.getInstance()
  if (queue.canShow(message, "info") && toastShowFn) {
    toastShowFn(message, "info", options)
  }
}

/**
 * Show a warning toast (with dedup)
 */
export function showToastWarning(message: string, options?: ToastOptions) {
  const queue = ToastQueue.getInstance()
  if (queue.canShow(message, "warning") && toastShowFn) {
    toastShowFn(message, "warning", options)
  }
}

/**
 * Clear all recent toast history (reset dedup)
 */
export function clearToastHistory() {
  ToastQueue.getInstance().reset()
}
