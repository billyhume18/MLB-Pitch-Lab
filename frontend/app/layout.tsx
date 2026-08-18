import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import Navbar from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'Pitch Lab',
  description: 'Research-grade baseball pitch analysis powered by Statcast',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#060e1a] text-slate-100 h-screen flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 min-h-0">{children}</main>
      </body>
    </html>
  )
}
