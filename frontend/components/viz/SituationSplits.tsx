'use client'
import { useMemo } from 'react'
import { pitchColor } from '@/lib/colors'
import { calcWhiffPct, calcCSWPct, avg } from '@/lib/filters'
import ExportMenu from '@/components/table/ExportMenu'
import type { StatcastPitch } from '@/lib/types'

interface Props { pitches: StatcastPitch[] }

const COUNT_STATES = [
  '0-0', '0-1', '0-2',
  '1-0', '1-1', '1-2',
  '2-0', '2-1', '2-2',
  '3-0', '3-1', '3-2',
]

function pct(n: number | null) {
  return n === null ? '—' : (n * 100).toFixed(1) + '%'
}
function num(n: number | null, d = 1) {
  return n === null ? '—' : n.toFixed(d)
}

// Velocity/spin are only meaningful when every row is a single pitch type —
// averaging a 98mph fastball with an 82mph curveball into one "velo" number
// is not a usable stat. showVeloSpin is true only for tables where each row
// is already scoped to one pitch type (vs LHB/RHB below).
function SplitRow({ label, pitches, types, showVeloSpin }: {
  label: string
  pitches: StatcastPitch[]
  types: string[]
  showVeloSpin: boolean
}) {
  if (pitches.length === 0) return null
  const w     = calcWhiffPct(pitches)
  const csw   = calcCSWPct(pitches)
  const xwoba = avg(pitches.map(p => p.estimated_woba_using_speedangle))
  const velo  = avg(pitches.map(p => p.release_speed))
  const spin  = avg(pitches.map(p => p.release_spin_rate))
  const typeDist = Object.fromEntries(
    types.map(t => [t, pitches.filter(p => p.pitch_type === t).length / pitches.length])
  )
  return (
    <tr className="border-b border-navy-800 hover:bg-navy-800/50 transition-colors">
      <td className="py-1.5 px-2 text-slate-300 font-mono text-xs whitespace-nowrap">{label}</td>
      <td className="py-1.5 px-2 text-slate-400 text-xs text-right">{pitches.length}</td>
      {showVeloSpin && <td className="py-1.5 px-2 text-right text-xs font-mono">{num(velo, 1)}</td>}
      {showVeloSpin && <td className="py-1.5 px-2 text-right text-xs font-mono">{num(spin, 0)}</td>}
      <td className="py-1.5 px-2 text-right text-xs font-mono">{pct(w)}</td>
      <td className="py-1.5 px-2 text-right text-xs font-mono">{pct(csw)}</td>
      <td className="py-1.5 px-2 text-right text-xs font-mono">{num(xwoba, 3)}</td>
      {!showVeloSpin && types.map(t => (
        <td key={t} className="py-1.5 px-2 text-right text-xs font-mono">
          <span style={{ color: pitchColor(t) }}>{pct(typeDist[t])}</span>
        </td>
      ))}
    </tr>
  )
}

function SplitTable({ title, rows, showVeloSpin = false, exportName }: {
  title: string
  rows: Array<{ label: string; pitches: StatcastPitch[] }>
  showVeloSpin?: boolean
  exportName: string
}) {
  const allPitches = rows.flatMap(r => r.pitches)
  const types = [...new Set(allPitches.map(p => p.pitch_type).filter(Boolean))].sort()
  if (allPitches.length === 0) return null

  const exportRows = rows.filter(r => r.pitches.length > 0).map(r => ({
    state: r.label,
    n: r.pitches.length,
    ...(showVeloSpin ? {
      velo: avg(r.pitches.map(p => p.release_speed)),
      spin: avg(r.pitches.map(p => p.release_spin_rate)),
    } : {}),
    whiff_pct: calcWhiffPct(r.pitches),
    csw_pct: calcCSWPct(r.pitches),
    xwoba: avg(r.pitches.map(p => p.estimated_woba_using_speedangle)),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <ExportMenu rows={exportRows} filenameBase={exportName} label="Export" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-navy-600 text-slate-500">
              <th className="text-left pb-1.5 px-2">State</th>
              <th className="text-right pb-1.5 px-2">N</th>
              {showVeloSpin && <th className="text-right pb-1.5 px-2">Velo</th>}
              {showVeloSpin && <th className="text-right pb-1.5 px-2">Spin</th>}
              <th className="text-right pb-1.5 px-2">Whiff%</th>
              <th className="text-right pb-1.5 px-2">CSW%</th>
              <th className="text-right pb-1.5 px-2">xwOBA</th>
              {!showVeloSpin && types.map(t => (
                <th key={t} className="text-right pb-1.5 px-2" style={{ color: pitchColor(t) }}>{t}%</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <SplitRow key={r.label} label={r.label} pitches={r.pitches} types={types} showVeloSpin={showVeloSpin} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Average velocity of each pitch type in each count state — unlike an
// all-pitch-type "velo per count" average, this is directly actionable
// (e.g. does the fastball velo dip in 3-0 counts vs 0-2).
function VeloByCountMatrix({ pitches }: { pitches: StatcastPitch[] }) {
  const { types, cells } = useMemo(() => {
    const types = [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort()
    const cells = types.map(type => {
      const row: Record<string, number | null> = {}
      for (const cs of COUNT_STATES) {
        const [b, s] = cs.split('-').map(Number)
        const g = pitches.filter(p => p.pitch_type === type && p.balls === b && p.strikes === s)
        row[cs] = g.length > 0 ? avg(g.map(p => p.release_speed)) : null
      }
      return { type, row }
    })
    return { types, cells }
  }, [pitches])

  if (types.length === 0) return null

  const exportRows = cells.map(({ type, row }) => ({ pitch_type: type, ...row }))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Velocity by Count — By Pitch Type</h3>
          <p className="text-xs text-slate-500">Each cell is that pitch type's own average velo in that count — not mixed across types.</p>
        </div>
        <ExportMenu rows={exportRows} filenameBase="velo_by_count_by_pitch_type" label="Export" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-navy-600 text-slate-500">
              <th className="text-left pb-1.5 px-2">Type</th>
              {COUNT_STATES.map(cs => <th key={cs} className="text-right pb-1.5 px-2">{cs}</th>)}
            </tr>
          </thead>
          <tbody>
            {cells.map(({ type, row }) => (
              <tr key={type} className="border-b border-navy-800">
                <td className="py-1.5 px-2 font-mono font-semibold" style={{ color: pitchColor(type) }}>{type}</td>
                {COUNT_STATES.map(cs => (
                  <td key={cs} className="py-1.5 px-2 text-right font-mono text-slate-300">
                    {row[cs] !== null ? row[cs]!.toFixed(1) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SituationSplits({ pitches }: Props) {
  const { countRows, inningRows, baseRows, lhbRows, rhbRows } = useMemo(() => {
    const countRows = COUNT_STATES.map(cs => {
      const [b, s] = cs.split('-').map(Number)
      return { label: cs, pitches: pitches.filter(p => p.balls === b && p.strikes === s) }
    })

    const innings = [...new Set(pitches.map(p => p.inning))].sort((a, b) => a - b)
    const inningRows = innings.map(i => ({
      label: i >= 9 ? '9+' : String(i),
      pitches: pitches.filter(p => i >= 9 ? p.inning >= 9 : p.inning === i),
    })).filter((r, i, arr) => !arr.slice(0, i).some(prev => prev.label === r.label))

    const baseRows = [
      { label: 'Empty',       pitches: pitches.filter(p => !p.on_1b && !p.on_2b && !p.on_3b) },
      { label: '1B Only',     pitches: pitches.filter(p => p.on_1b && !p.on_2b && !p.on_3b) },
      { label: '2B Only',     pitches: pitches.filter(p => !p.on_1b && p.on_2b && !p.on_3b) },
      { label: '3B Only',     pitches: pitches.filter(p => !p.on_1b && !p.on_2b && p.on_3b) },
      { label: '1B + 2B',     pitches: pitches.filter(p => p.on_1b && p.on_2b && !p.on_3b) },
      { label: '1B + 3B',     pitches: pitches.filter(p => p.on_1b && !p.on_2b && p.on_3b) },
      { label: '2B + 3B',     pitches: pitches.filter(p => !p.on_1b && p.on_2b && p.on_3b) },
      { label: 'Loaded',      pitches: pitches.filter(p => p.on_1b && p.on_2b && p.on_3b) },
      { label: 'Scoring Pos', pitches: pitches.filter(p => p.on_2b || p.on_3b) },
    ]

    const lhbGroup = pitches.filter(p => p.stand === 'L')
    const rhbGroup = pitches.filter(p => p.stand === 'R')
    const types = [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort()
    const lhbRows = types.map(t => ({
      label: t,
      pitches: lhbGroup.filter(p => p.pitch_type === t),
    }))
    const rhbRows = types.map(t => ({
      label: t,
      pitches: rhbGroup.filter(p => p.pitch_type === t),
    }))

    return { countRows, inningRows, baseRows, lhbRows, rhbRows }
  }, [pitches])

  if (pitches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Load data to see Situation Splits
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto space-y-8">
      <VeloByCountMatrix pitches={pitches} />
      <SplitTable title="By Count" rows={countRows} exportName="splits_by_count" />
      <SplitTable title="By Inning" rows={inningRows} exportName="splits_by_inning" />
      <SplitTable title="By Base State" rows={baseRows} exportName="splits_by_base_state" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SplitTable title="vs LHB — By Pitch Type" rows={lhbRows} showVeloSpin exportName="splits_vs_lhb_by_pitch_type" />
        <SplitTable title="vs RHB — By Pitch Type" rows={rhbRows} showVeloSpin exportName="splits_vs_rhb_by_pitch_type" />
      </div>
    </div>
  )
}
