'use client'
import { useMemo, useState } from 'react'
import { calcPitcherSummary, type PitcherSummary } from '@/lib/metrics'
import ExportMenu from '@/components/table/ExportMenu'
import type { StatcastPitch } from '@/lib/types'

interface Props {
  current: Record<string, unknown> | null
  currentLabel: string
  career: Record<string, unknown> | null
  priorSeason: Record<string, unknown> | null
  priorSeasonLabel: string
  pitches: StatcastPitch[]
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

// Pitch/stuff metrics, unlike the traditional rate stats above, are derived
// directly from the loaded Statcast pull rather than the MLB Stats API, so
// the slices available are limited to what's actually in memory: the full
// loaded range, the single most recent outing, or the range minus that
// outing. Career/prior-season pitch-level Statcast isn't loaded (it would
// mean an extra multi-month fetch per pitcher), so those stay traditional-
// stat-only above.
type PitchSlice = 'season' | 'lastOuting' | 'restOfSeason'

const SLICE_LABEL: Record<PitchSlice, string> = {
  season: 'Full Loaded Range',
  lastOuting: 'Last Outing',
  restOfSeason: 'Rest of Range (excl. last outing)',
}

interface PitchRow { label: string; key: keyof PitcherSummary; decimals: number; pct?: boolean }

const PITCH_ROWS: PitchRow[] = [
  { label: 'Pitches',     key: 'pitchCount', decimals: 0 },
  { label: 'Avg Velo',    key: 'avgVelo',    decimals: 1 },
  { label: 'Velo SD',     key: 'veloSd',     decimals: 2 },
  { label: 'Avg Spin',    key: 'avgSpin',    decimals: 0 },
  { label: 'Spin SD',     key: 'spinSd',     decimals: 0 },
  { label: 'Whiff%',      key: 'whiffPct',   decimals: 1, pct: true },
  { label: 'CSW%',        key: 'cswPct',     decimals: 1, pct: true },
  { label: 'Chase%',      key: 'chasePct',   decimals: 1, pct: true },
  { label: 'Zone%',       key: 'zonePct',    decimals: 1, pct: true },
  { label: 'Hard-Hit%',   key: 'hardHitPct', decimals: 1, pct: true },
  { label: 'Barrel%',     key: 'barrelPct',  decimals: 1, pct: true },
  { label: 'xwOBA',       key: 'xwoba',      decimals: 3 },
  { label: 'xBA',         key: 'xba',        decimals: 3 },
]

function findLastOutingGamePk(pitches: StatcastPitch[]): number | null {
  if (pitches.length === 0) return null
  let best: StatcastPitch | null = null
  for (const p of pitches) {
    if (!best || p.game_date > best.game_date) best = p
  }
  return best?.game_pk ?? null
}

function pitchesForSlice(pitches: StatcastPitch[], slice: PitchSlice, lastGamePk: number | null): StatcastPitch[] {
  if (slice === 'season') return pitches
  if (lastGamePk === null) return []
  if (slice === 'lastOuting') return pitches.filter(p => p.game_pk === lastGamePk)
  return pitches.filter(p => p.game_pk !== lastGamePk)
}

export default function BaselineCompare({ current, currentLabel, career, priorSeason, priorSeasonLabel, pitches }: Props) {
  const [choice, setChoice] = useState<BaselineChoice>(priorSeason ? 'prior' : 'career')
  const baseline = choice === 'career' ? career : priorSeason
  const baselineLabel = choice === 'career' ? 'Career' : priorSeasonLabel

  const [pitchCurrentSlice, setPitchCurrentSlice] = useState<PitchSlice>('lastOuting')
  const [pitchBaselineSlice, setPitchBaselineSlice] = useState<PitchSlice>('restOfSeason')

  const lastGamePk = useMemo(() => findLastOutingGamePk(pitches), [pitches])

  const pitchCurrentSummary = useMemo(
    () => calcPitcherSummary(pitchesForSlice(pitches, pitchCurrentSlice, lastGamePk)),
    [pitches, pitchCurrentSlice, lastGamePk]
  )
  const pitchBaselineSummary = useMemo(
    () => calcPitcherSummary(pitchesForSlice(pitches, pitchBaselineSlice, lastGamePk)),
    [pitches, pitchBaselineSlice, lastGamePk]
  )

  const pitchExportRows = PITCH_ROWS.map(r => ({
    stat: r.label,
    [SLICE_LABEL[pitchCurrentSlice]]: pitchCurrentSummary[r.key],
    [SLICE_LABEL[pitchBaselineSlice]]: pitchBaselineSummary[r.key],
  }))

  if (!current) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Baseline Comparison</div>
  }

  return (
    <div className="h-full overflow-auto space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Traditional Rate Stats vs. Own Baseline</h2>
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

      <div>
        <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Pitch / Stuff Metrics vs. Own Baseline</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Derived from the currently loaded Statcast pull, so both sides are limited to slices of it —
              career/prior-season pitch-level Statcast isn&apos;t loaded here and stays in the traditional table above.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              Current
              <select
                value={pitchCurrentSlice}
                onChange={e => setPitchCurrentSlice(e.target.value as PitchSlice)}
                className="bg-navy-800 border border-navy-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {(Object.keys(SLICE_LABEL) as PitchSlice[]).map(s => (
                  <option key={s} value={s} disabled={s === 'lastOuting' && lastGamePk === null}>{SLICE_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              Baseline
              <select
                value={pitchBaselineSlice}
                onChange={e => setPitchBaselineSlice(e.target.value as PitchSlice)}
                className="bg-navy-800 border border-navy-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {(Object.keys(SLICE_LABEL) as PitchSlice[]).map(s => (
                  <option key={s} value={s} disabled={s === 'lastOuting' && lastGamePk === null}>{SLICE_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <ExportMenu rows={pitchExportRows} filenameBase="baseline_pitch_metrics" label="Export" />
          </div>
        </div>

        {pitches.length === 0 ? (
          <div className="text-slate-500 text-sm">No pitch-level data loaded.</div>
        ) : (
          <table className="text-sm border-collapse w-full max-w-2xl">
            <thead>
              <tr className="border-b border-navy-700 text-slate-500 text-xs">
                <th className="text-left pb-2">Stat</th>
                <th className="text-right pb-2 px-3">{SLICE_LABEL[pitchCurrentSlice]}</th>
                <th className="text-right pb-2 px-3">{SLICE_LABEL[pitchBaselineSlice]}</th>
                <th className="text-right pb-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {PITCH_ROWS.map(r => {
                const cur = pitchCurrentSummary[r.key]
                const base = pitchBaselineSummary[r.key]
                const delta = cur !== null && base !== null ? cur - base : null
                const fmt = (v: number | null) => v === null ? '—' : r.pct ? (v * 100).toFixed(r.decimals) + '%' : v.toFixed(r.decimals)
                return (
                  <tr key={r.key} className="border-b border-navy-800">
                    <td className="py-2 text-slate-300">{r.label}</td>
                    <td className="py-2 px-3 text-right font-mono text-white">{fmt(cur)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{fmt(base)}</td>
                    <td className="py-2 text-right font-mono text-slate-500">
                      {delta !== null ? (delta > 0 ? '+' : '') + (r.pct ? (delta * 100).toFixed(r.decimals) + '%' : delta.toFixed(r.decimals)) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
