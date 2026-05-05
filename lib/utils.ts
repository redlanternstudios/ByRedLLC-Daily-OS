import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strip legacy phase-numbering prefixes from task titles (e.g. "8.4 — Define..." → "Define...")
export function cleanTitle(raw: string): string {
  return raw.replace(/^\d+(\.\d+)* — /, "").trim()
}
