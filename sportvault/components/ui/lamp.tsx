'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LampContainerProps {
  children: React.ReactNode
  className?: string
  accentColor?: string
}

export function LampContainer({ children, className, accentColor = '#d97706' }: LampContainerProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-[480px] flex-col items-center justify-center overflow-hidden w-full',
        className
      )}
      style={{ background: '#f7f6f3' }}
    >
      {/* Lamp beam — two conic gradients forming a cone of light */}
      <div className="relative isolate flex w-full flex-1 items-center justify-center">
        {/* Left beam */}
        <motion.div
          initial={{ opacity: 0, width: '8rem' }}
          animate={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{
            backgroundImage: `conic-gradient(from 70deg at center top, transparent 0deg, ${accentColor}22 30deg, ${accentColor}55 60deg, ${accentColor}22 90deg, transparent 90deg)`,
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%) rotate(0deg)',
            transformOrigin: 'top center',
            height: '100%',
            filter: 'blur(2px)',
          }}
        />

        {/* Core glow under lamp head */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '14rem',
            height: '6px',
            background: accentColor,
            borderRadius: '0 0 50% 50%',
            boxShadow: `0 0 40px 20px ${accentColor}44, 0 0 80px 40px ${accentColor}22, 0 0 120px 60px ${accentColor}11`,
          }}
        />

        {/* Radial fade pool on the floor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '28rem',
            height: '12rem',
            background: `radial-gradient(ellipse at top, ${accentColor}18 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />

        {/* Content sits above the beams */}
        <div className="relative z-10 flex flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  )
}
