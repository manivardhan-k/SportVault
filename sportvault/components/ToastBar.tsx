'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ToastDetail } from '@/lib/toast'

type ToastItem = ToastDetail

export function ToastBar() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const timeouts = new Map<string, number>()

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail
      if (!detail) return
      
      setItems(prev => {
        const existing = prev.find(x => x.message === detail.message)
        
        if (timeouts.has(detail.message)) {
          window.clearTimeout(timeouts.get(detail.message))
        }
        
        const t = window.setTimeout(() => {
          setItems(p => p.filter(x => x.message !== detail.message))
          timeouts.delete(detail.message)
        }, 2400)
        timeouts.set(detail.message, t)

        if (existing) {
          return prev
        }
        return [...prev, detail]
      })
    }
    window.addEventListener('sv-toast', handler)
    return () => window.removeEventListener('sv-toast', handler)
  }, [])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {items.map(t => (
          <motion.div
            key={t.id}
            initial={{ y: -16, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="px-4 py-2 rounded-md text-[12px] shadow-lg pointer-events-auto"
            style={{
              background: t.variant === 'error' ? '#1f0f0f' : '#111110',
              color: '#faf9f7',
              border: t.variant === 'error' ? '1px solid #7f1d1d' : '1px solid #2a2a2a',
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
