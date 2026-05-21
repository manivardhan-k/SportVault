'use client'

export interface ToastDetail {
  id: number
  message: string
  variant?: 'info' | 'error'
}

export function notify(message: string, variant: 'info' | 'error' = 'info') {
  if (typeof window === 'undefined') return
  const detail: ToastDetail = { id: Date.now() + Math.random(), message, variant }
  window.dispatchEvent(new CustomEvent<ToastDetail>('sv-toast', { detail }))
}
