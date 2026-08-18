'use client'
import { useMemo, useState } from 'react'
import { pitchColor } from '@/lib/colors'
import type { StatcastPitch } from '@/lib/types'

interface Props { pitches: StatcastPitch[] }

export default function SequencingMatrix({ pitches }: Props) {
  const [showCounts, setShowCounts] = useState(false)

  const { matrix, rawCounts, types } = useMemo(() => {
    const sorted = [...pitches].sort((a, b) => {
      if (a.game_pk !== b.game_pk) return a.game_pk - b.game_pk
      if (a.at_bat_number !== b.at_bat_number) return a.at_bat_number - b.at_bat_number
      return a.pitch_number - b.pitch_number
    })

    const counts: Record<string, Record<string, number>> = {}
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i]
      const nxt = sorted[i + 1]
      if (cur.game_pk !== nxt.game_pk || cur.at_bat_number !== nxt.at_bat_number) continue
      const from = cur.pitch_type
      const to = nxt.pitch_type
      if (!counts[from]) counts[from] = {}
      counts[from][to] = (counts[from][to] ?? 0) + 1
    }

    const types = [...new Set([
      ...Object.keys(counts),
      ...Object.values(counts).flatMap(v => Object.keys(v)),
    ])].sort()

    const matrix: Record<string, Record<string, number>> = {}
    const rowTotals: Record<string, number> = {}
    for (const from of types) {
      rowTotals[from] = types.reduce((s, to) => s + (counts[from]?.[to] ?? 0), 0)
    }
    for (const from of types) {
      matrix[from] = {}
      const total = rowTotals[from]
      for (const to of types) {
        const n = counts[from]?.[to] ?? 0
        matrix[from][to] = total > 0 ? n / total : 0
      }
    }

    return { matrix, rawCounts: counts, types }
  }, [pitches])

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Sequencing</div>
  }
  if (types.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">No within-AB sequencing data</div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-white">Next-Pitch Sequencing</h2>
          <p className="text-xs text-slate-400 mt-0.5">Row = current pitch · Column = next pitch (within at-bat only)</p>
        </div>
        <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
          <button onClick={() => setShowCounts(false)}
            className={`px-2 py-1 ${!showCounts ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
            Pct
          </button>
          <button onClick={() => setShowCounts(true)}
            className={`px-2 py-1 ${showCounts ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
            Count
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 min-h-0">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-12 text-slate-500 text-right pr-3 pb-2 text-[10px] uppercase">→</th>
              {types.map(to => (
                <th key={to} className="pb-2 px-2 text-center font-mono font-semibold min-w-[3rem]"
                  style={{ color: pitchColor(to) }}>
                  {to}
                </th>
              ))}
              <th className="pb-2 px-2 text-right text-slate-500 font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {types.map(from => {
              const rowTotal = types.reduce((s, to) => s + (rawCounts[from]?.[to] ?? 0), 0)
              return (
                <tr key={from}>
                  <td className="pr-3 py-1.5 text-right font-mono font-semibold" style={{ color: pitchColor(from) }}>
                    {from}
                  </td>
                  {types.map(to => {
                    const pct = matrix[from]?.[to] ?? 0
                    const count = rawCounts[from]?.[to] ?? 0
                    const title = `${from} → ${to}: ${count} times (${(pct * 100).toFixed(1)}%)`
                    return (
                      <td key={to} className="px-2 py-1.5 text-center min-w-[3rem]"
                        style={{ backgroundColor: `rgba(59,130,246,${pct * 0.85})` }}
                        title={title}>
                        <span className={pct > 0.35 ? 'text-white' : 'text-slate-300'}>
                          {showCounts
                            ? (count > 0 ? count : '—')
                            : pct > 0.005 ? `${(pct * 100).toFixed(0)}%` : '—'}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5 text-right text-slate-500">{rowTotal}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
