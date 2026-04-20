import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { SportTabs } from '@/components/layout/SportTabs'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'SportVault',
  description: 'Historical sports data — F1, Soccer, NFL, NBA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} dark h-full`}>
      <body className="flex min-h-full flex-col bg-zinc-950 font-sans text-white antialiased">
        <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="text-lg font-bold tracking-tight">SportVault</span>
          </div>
          <SportTabs />
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  )
}
