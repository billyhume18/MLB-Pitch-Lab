'use client'
import { downloadFilteredCSV } from '@/lib/api'
import type { StatcastPitch } from '@/lib/types'

interface Props {
  pitches: StatcastPitch[]
  filename?: string
  label?: string
  className?: string
}

export default function ExportButton({
  pitches,
  filename = 'statcast_filtered.csv',
  label = 'Export CSV',
  className = '',
}: Props) {
  return (
    <button
      onClick={() => downloadFilteredCSV(pitches, filename)}
      disabled={pitches.length === 0}
      className={`px-3 py-1.5 rounded border border-slate-600 text-xs text-slate-300 hover:bg-navy-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {label} ({pitches.length.toLocaleString()})
    </button>
  )
}
