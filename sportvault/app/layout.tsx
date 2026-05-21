import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SportTabs } from '@/components/layout/SportTabs'
import { HeaderUserMenu } from '@/components/layout/HeaderUserMenu'
import { CompareBasketBar } from '@/components/compare/CompareBasketBar'
import { ToastBar } from '@/components/ToastBar'
import './globals.css'

export const metadata: Metadata = {
  title: 'SportVault',
  description: 'Historical sports data for F1, NFL, NBA, Cricket, Tennis, Soccer, and MMA.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className="flex min-h-full flex-col bg-sv-bg text-sv-text-primary antialiased"
        style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}
      >
        <header className="sticky top-0 z-20 bg-sv-surface flex items-center h-[52px]" style={{ boxShadow: 'inset 0 -1px 0 #e4e3df' }}>
          <div className="flex-1 min-w-0">
            <SportTabs />
          </div>
          <HeaderUserMenu />
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <Suspense fallback={null}>
          <CompareBasketBar />
        </Suspense>
        <ToastBar />
      </body>
    </html>
  )
}
