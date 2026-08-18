'use client'
import { Fragment, useState, useMemo, useCallback } from 'react'
import PlayerSearch from '@/components/controls/PlayerSearch'
import DateRangePicker from '@/components/controls/DateRangePicker'
import Spinner from '@/components/ui/Spinner'
import WorkloadChart from '@/components/viz/WorkloadChart'
import ExportMenu from '@/components/table/ExportMenu'
import { fetchPitches, getSeasonStats, getSaberStats } from '@/lib/api'
import { useTimeFrame } from '@/lib/timeframe'
import {
  calcPitcherSummary, calcK9, calcBB9, calcKPctFromApi, calcBBPctFromApi,
} from '@/lib/metrics'
import { avg } from '@/lib/filters'
import type { PlayerSearchResult, StatcastPitch } from '@/lib/types'

interface RosterEntry {
  player: PlayerSearchResult
  included: boolean
  pitches: StatcastPitch[]
  seasonStats: Record<string, unknown> | null
  saberStats: Record<string, unknown> | null
  loading: boolean
  error: string | null
  expanded: boolean
}

function apiNum(data: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!data) return null
  for (const k of keys) {
    const v = data[k]
    if (v !== null && v !== undefined && v !== '') {
      const n = Number(v)
      if (!isNaN(n)) return n
    }
  }
  return null
}

function computeRow(pitches: StatcastPitch[], seasonStats: Record<string, unknown> | null, saberStats: Record<string, unknown> | null) {
  const s = calcPitcherSummary(pitches)
  return {
    ...s,
    era: apiNum(seasonStats, 'era'),
    whip: apiNum(seasonStats, 'whip'),
    wins: apiNum(seasonStats, 'wins'),
    losses: apiNum(seasonStats, 'losses'),
    saves: apiNum(seasonStats, 'saves'),
    k9: calcK9(seasonStats),
    bb9: calcBB9(seasonStats),
    kPct: calcKPctFromApi(seasonStats),
    bbPct: calcBBPctFromApi(seasonStats),
    fip: apiNum(saberStats, 'fip'),
    xfip: apiNum(saberStats, 'xfip'),
    war: apiNum(saberStats, 'war'),
  }
}

type Row = ReturnType<typeof computeRow>

const COLS: Array<{ key: keyof Row; label: string; decimals: number; pctOf100?: boolean }> = [
  { key: 'pitchCount', label: 'Pitches',  decimals: 0 },
  { key: 'avgVelo',    label: 'Velo',     decimals: 1 },
  { key: 'veloSd',     label: 'Velo SD',  decimals: 2 },
  { key: 'avgSpin',    label: 'Spin',     decimals: 0 },
  { key: 'spinSd',     label: 'Spin SD',  decimals: 0 },
  { key: 'whiffPct',   label: 'Whiff%',   decimals: 1, pctOf100: true },
  { key: 'cswPct',     label: 'CSW%',     decimals: 1, pctOf100: true },
  { key: 'chasePct',   label: 'Chase%',   decimals: 1, pctOf100: true },
  { key: 'zonePct',    label: 'Zone%',    decimals: 1, pctOf100: true },
  { key: 'hardHitPct', label: 'HardHit%', decimals: 1, pctOf100: true },
  { key: 'barrelPct',  label: 'Barrel%',  decimals: 1, pctOf100: true },
  { key: 'xwoba',      label: 'xwOBA',    decimals: 3 },
  { key: 'xba',        label: 'xBA',      decimals: 3 },
  { key: 'era',        label: 'ERA',      decimals: 2 },
  { key: 'whip',       label: 'WHIP',     decimals: 2 },
  { key: 'k9',         label: 'K/9',      decimals: 1 },
  { key: 'bb9',        label: 'BB/9',     decimals: 1 },
  { key: 'kPct',       label: 'K%',       decimals: 1, pctOf100: true },
  { key: 'bbPct',      label: 'BB%',      decimals: 1, pctOf100: true },
  { key: 'fip',        label: 'FIP',      decimals: 2 },
  { key: 'xfip',       label: 'xFIP',     decimals: 2 },
  { key: 'war',        label: 'WAR',      decimals: 2 },
]

function fmtCell(v: number | null, decimals: number, pctOf100?: boolean): string {
  if (v === null || isNaN(v)) return '—'
  return pctOf100 ? (v * 100).toFixed(decimals) + '%' : v.toFixed(decimals)
}

export default function RosterPage() {
  const { startDate, endDate } = useTimeFrame()
  const [entries, setEntries] = useState<RosterEntry[]>([])
  const [minPitchesSeason, setMinPitchesSeason] = useState<number | null>(null)

  const yr = Number(startDate.slice(0, 4))

  const loadEntry = useCallback(async (player: PlayerSearchResult) => {
    setEntries(prev => [
      ...prev,
      { player, included: true, pitches: [], seasonStats: null, saberStats: null, loading: true, error: null, expanded: false },
    ])
    try {
      const [pitchData, season, saber] = await Promise.all([
        fetchPitches(player.key_mlbam, startDate, endDate),
        getSeasonStats(player.key_mlbam, yr),
        getSaberStats(player.key_mlbam, yr),
      ])
      setEntries(prev => prev.map(e => e.player.key_mlbam === player.key_mlbam
        ? { ...e, pitches: pitchData.pitches ?? [], seasonStats: season, saberStats: saber, loading: false }
        : e))
    } catch (err) {
      setEntries(prev => prev.map(e => e.player.key_mlbam === player.key_mlbam
        ? { ...e, loading: false, error: err instanceof Error ? err.message : 'Load failed' }
        : e))
    }
  }, [startDate, endDate, yr])

  const removeEntry = (id: number) => setEntries(prev => prev.filter(e => e.player.key_mlbam !== id))
  const toggleIncluded = (id: number) => setEntries(prev => prev.map(e => e.player.key_mlbam === id ? { ...e, included: !e.included } : e))
  const toggleExpanded = (id: number) => setEntries(prev => prev.map(e => e.player.key_mlbam === id ? { ...e, expanded: !e.expanded } : e))

  // Section 2's "min pitches thrown in the season" — hides pitchers under threshold from the table/group
  const qualifying = useMemo(
    () => entries.filter(e => minPitchesSeason === null || e.pitches.length >= minPitchesSeason),
    [entries, minPitchesSeason]
  )

  const rows = useMemo(
    () => qualifying.map(e => ({ entry: e, row: computeRow(e.pitches, e.seasonStats, e.saberStats) })),
    [qualifying]
  )

  const included = useMemo(() => qualifying.filter(e => e.included && e.pitches.length > 0), [qualifying])

  const groupRow = useMemo(() => {
    if (included.length === 0) return null
    const combinedPitches = included.flatMap(e => e.pitches)
    const perPitcherRows = included.map(e => computeRow(e.pitches, e.seasonStats, e.saberStats))
    const base = computeRow(combinedPitches, null, null)
    // Rate stats sourced from the traditional-stats API (era/whip/k9/etc.) are
    // averaged across the group's pitchers rather than recomputed from combined
    // pitch-level data, since those come from the MLB Stats API, not Statcast.
    return {
      ...base,
      era: avg(perPitcherRows.map(r => r.era)),
      whip: avg(perPitcherRows.map(r => r.whip)),
      k9: avg(perPitcherRows.map(r => r.k9)),
      bb9: avg(perPitcherRows.map(r => r.bb9)),
      kPct: avg(perPitcherRows.map(r => r.kPct)),
      bbPct: avg(perPitcherRows.map(r => r.bbPct)),
      fip: avg(perPitcherRows.map(r => r.fip)),
      xfip: avg(perPitcherRows.map(r => r.xfip)),
      war: avg(perPitcherRows.map(r => r.war)),
    }
  }, [included])

  const exportRows = useMemo(() => rows.map(({ entry, row }) => ({
    pitcher: `${entry.player.name_first} ${entry.player.name_last}`,
    mlbam_id: entry.player.key_mlbam,
    included_in_group: entry.included,
    ...row,
  })), [rows])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-end gap-4 p-4 border-b border-navy-700 shrink-0 flex-wrap">
        <div className="max-w-xs">
          <DateRangePicker />
        </div>
        <div className="w-64">
          <label className="block text-xs text-slate-400 mb-1">Add Pitcher</label>
          <PlayerSearch
            selected={null}
            onSelect={p => {
              if (!entries.some(e => e.player.key_mlbam === p.key_mlbam)) loadEntry(p)
            }}
          />
        </div>
        <div className="w-40">
          <label className="block text-xs text-slate-400 mb-1">Min Pitches / Season</label>
          <input
            type="number" min={0}
            value={minPitchesSeason ?? ''}
            onChange={e => setMinPitchesSeason(e.target.value === '' ? null : Number(e.target.value))}
            placeholder="e.g. 200"
            className="w-full bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        {rows.length > 0 && (
          <ExportMenu rows={exportRows} filenameBase={`roster_${startDate}_${endDate}`} label="Export Roster" />
        )}
        <div className="text-xs text-slate-500 ml-auto">
          {entries.length} pitcher{entries.length === 1 ? '' : 's'} added
          {minPitchesSeason !== null && entries.length !== qualifying.length &&
            ` · ${entries.length - qualifying.length} hidden (below min pitches)`}
        </div>
      </div>

      {entries.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Add pitchers above to build an ad hoc roster — check them off to see a combined group average.
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse min-w-full">
              <thead className="sticky top-0 bg-[#060e1a] z-10">
                <tr className="border-b border-navy-700 text-slate-500">
                  <th className="text-left pb-2 px-2">Group</th>
                  <th className="text-left pb-2 px-2">Pitcher</th>
                  {COLS.map(c => <th key={c.key} className="text-right pb-2 px-2 whitespace-nowrap">{c.label}</th>)}
                  <th className="pb-2 px-2"></th>
                  <th className="pb-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {groupRow && (
                  <tr className="border-b border-navy-700 bg-blue-900/20 font-semibold">
                    <td className="py-2 px-2 text-blue-300">—</td>
                    <td className="py-2 px-2 text-blue-300">Group Average ({included.length})</td>
                    {COLS.map(c => (
                      <td key={c.key} className="py-2 px-2 text-right font-mono text-blue-200">
                        {fmtCell(groupRow[c.key], c.decimals, c.pctOf100)}
                      </td>
                    ))}
                    <td /><td />
                  </tr>
                )}
                {rows.map(({ entry, row }) => (
                  <Fragment key={entry.player.key_mlbam}>
                    <tr className={`border-b border-navy-800 ${entry.included ? 'bg-navy-800/40' : ''}`}>
                      <td className="py-1.5 px-2">
                        <input
                          type="checkbox"
                          checked={entry.included}
                          onChange={() => toggleIncluded(entry.player.key_mlbam)}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-slate-200 whitespace-nowrap">
                        {entry.player.name_first} {entry.player.name_last}
                        {entry.loading && <Spinner size="sm" />}
                        {entry.error && <span className="text-red-400 ml-1">({entry.error})</span>}
                      </td>
                      {COLS.map(c => (
                        <td key={c.key} className="py-1.5 px-2 text-right font-mono text-slate-300">
                          {fmtCell(row[c.key], c.decimals, c.pctOf100)}
                        </td>
                      ))}
                      <td className="py-1.5 px-2">
                        <button
                          onClick={() => toggleExpanded(entry.player.key_mlbam)}
                          className="text-slate-500 hover:text-white text-xs"
                        >
                          {entry.expanded ? 'Hide workload ▲' : 'Workload ▼'}
                        </button>
                      </td>
                      <td className="py-1.5 px-2">
                        <button onClick={() => removeEntry(entry.player.key_mlbam)} className="text-slate-500 hover:text-red-400 text-xs">
                          Remove
                        </button>
                      </td>
                    </tr>
                    {entry.expanded && (
                      <tr>
                        <td colSpan={COLS.length + 4} className="p-3 bg-navy-900/60">
                          <div className="h-96">
                            <WorkloadChart pitches={entry.pitches} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
