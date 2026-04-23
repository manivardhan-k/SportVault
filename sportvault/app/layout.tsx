import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { SportTabs } from '@/components/layout/SportTabs'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})
const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SportVault',
  description: 'Historical sports data — F1, Soccer, NFL, NBA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} h-full`}>
      <body
        className="flex min-h-full flex-col bg-sv-bg text-sv-text-primary antialiased"
        style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}
      >
        <header className="sticky top-0 z-20 bg-sv-surface border-b border-sv-divider">
          <SportTabs />
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  )
}
