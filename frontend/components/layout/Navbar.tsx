'use client'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="h-12 bg-navy-900 border-b border-navy-600 flex items-center px-4 gap-6 z-50 shrink-0">
      <Link href="/lab" className="text-white font-bold text-lg tracking-tight font-mono">
        Pitch<span className="text-blue-400">Lab</span>
      </Link>
    </nav>
  )
}
