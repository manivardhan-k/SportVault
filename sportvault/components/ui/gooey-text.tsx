'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GooeyTextProps {
  words: string[]
  interval?: number
  className?: string
  textClassName?: string
}

export function GooeyText({ words, interval = 2600, className, textClassName }: GooeyTextProps) {
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState<number | undefined>(undefined)
  const measureRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % words.length), interval)
    return () => clearInterval(id)
  }, [words.length, interval])

  useEffect(() => {
    if (measureRef.current) setWidth(measureRef.current.offsetWidth)
  }, [index])

  return (
    <motion.span
      className={cn('relative inline-block overflow-hidden align-bottom', className)}
      animate={{ width: width ?? 'auto' }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Hidden measurer */}
      <span
        ref={measureRef}
        aria-hidden
        className={cn('invisible absolute whitespace-nowrap font-bold pointer-events-none', textClassName)}
      >
        {words[index]}
      </span>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          className={cn('block font-bold whitespace-nowrap', textClassName)}
          initial={{ opacity: 0, y: 32, filter: 'blur(8px)', clipPath: 'inset(100% 0 0 0)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', clipPath: 'inset(0% 0 0 0)' }}
          exit={{ opacity: 0, y: -32, filter: 'blur(8px)', clipPath: 'inset(0 0 100% 0)' }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
            filter: { duration: 0.4 },
            clipPath: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  )
}
