'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/lab',     label: 'Lab' },
  { href: '/compare',  label: 'Compare' },
  { href: '/roster',   label: 'Roster' },
]

export default function Navbar() {
  const pathname = usePathname()
  return (
    <nav className="h-12 bg-navy-900 border-b border-navy-600 flex items-center px-4 gap-6 z-50 shrink-0">
      <Link href="/lab" className="text-white font-bold text-lg tracking-tight font-mono">
        Pitch<span className="text-blue-400">Lab</span>
      </Link>
      <div className="flex gap-1">
        {LINKS.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname?.startsWith(l.href) ? 'bg-navy-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
