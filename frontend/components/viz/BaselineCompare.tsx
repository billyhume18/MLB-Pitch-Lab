'use client'
import { useState } from 'react'

interface Props {
  current: Record<string, unknown> | null
  currentLabel: string
  career: Record<string, unknown> | null
  priorSeason: Record<string, unknown> | null
  priorSeasonLabel: string
}

type BaselineChoice = 'career' | 'prior'

function get(obj: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (v !== null && v !== undefined && v !== '') {
      const n = Number(v)
      if (!isNaN(n)) return n
    }
  }
  return null
}

interface Row { label: string; key: string; higherIsBetter: boolean; decimals: number }

const ROWS: Row[] = [
  { label: 'ERA',   key: 'era',   higherIsBetter: false, decimals: 2 },
  { label: 'WHIP',  key: 'whip',  higherIsBetter: false, decimals: 2 },
  { label: 'K/9',   key: 'k9',    higherIsBetter: true,  decimals: 1 },
  { label: 'BB/9',  key: 'bb9',   higherIsBetter: false, decimals: 1 },
  { label: 'K/BB',  key: 'kbb',   higherIsBetter: true,  decimals: 2 },
  { label: 'HR/9',  key: 'hr9',   higherIsBetter: false, decimals: 2 },
]

function rowValue(data: Record<string, unknown> | null, key: string): number | null {
  switch (key) {
    case 'era':  return get(data, 'era')
    case 'whip': return get(data, 'whip')
    case 'k9':   return get(data, 'strikeoutsPer9Inn', 'strikeouts_per9_inn')
    case 'bb9':  return get(data, 'walksPer9Inn', 'walks_per9_inn')
    case 'kbb':  return get(data, 'strikeoutWalkRatio', 'strikeout_walk_ratio')
    case 'hr9':  return get(data, 'homeRunsPer9', 'home_runs_per9')
    default:     return null
  }
}

export default function BaselineCompare({ current, currentLabel, career, priorSeason, priorSeasonLabel }: Props) {
  const [choice, setChoice] = useState<BaselineChoice>(priorSeason ? 'prior' : 'career')
  const baseline = choice === 'career' ? career : priorSeason
  const baselineLabel = choice === 'career' ? 'Career' : priorSeasonLabel

  if (!current) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Baseline Comparison</div>
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">Pitcher vs. Own Baseline</h2>
        <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
          <button onClick={() => setChoice('prior')} disabled={!priorSeason}
            className={`px-2 py-1 disabled:opacity-30 ${choice === 'prior' ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
            vs Prior Season
          </button>
          <button onClick={() => setChoice('career')} disabled={!career}
            className={`px-2 py-1 disabled:opacity-30 ${choice === 'career' ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
            vs Career
          </button>
        </div>
      </div>

      {!baseline ? (
        <div className="text-slate-500 text-sm">No baseline data available for this pitcher.</div>
      ) : (
        <table className="text-sm border-collapse w-full max-w-2xl">
          <thead>
            <tr className="border-b border-navy-700 text-slate-500 text-xs">
              <th className="text-left pb-2">Stat</th>
              <th className="text-right pb-2 px-3">{currentLabel}</th>
              <th className="text-right pb-2 px-3">{baselineLabel}</th>
              <th className="text-right pb-2">Δ</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(r => {
              const cur = rowValue(current, r.key)
              const base = rowValue(baseline, r.key)
              const delta = cur !== null && base !== null ? cur - base : null
              const good = delta !== null && (r.higherIsBetter ? delta > 0 : delta < 0)
              const bad  = delta !== null && (r.higherIsBetter ? delta < 0 : delta > 0)
              return (
                <tr key={r.key} className="border-b border-navy-800">
                  <td className="py-2 text-slate-300">{r.label}</td>
                  <td className="py-2 px-3 text-right font-mono text-white">{cur !== null ? cur.toFixed(r.decimals) : '—'}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">{base !== null ? base.toFixed(r.decimals) : '—'}</td>
                  <td className={`py-2 text-right font-mono ${good ? 'text-green-400' : bad ? 'text-red-400' : 'text-slate-500'}`}>
                    {delta !== null ? (delta > 0 ? '+' : '') + delta.toFixed(r.decimals) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
