'use client'
import { useMemo, useState, useCallback } from 'react'
import { pitchColor } from '@/lib/colors'
import type { StatcastPitch } from '@/lib/types'

const PAGE_SIZE = 100

// Canonical column order per spec
const ORDERED_COLS = [
  'game_date', 'game_pk', 'inning', 'inning_topbot', 'at_bat_number', 'pitch_number',
  'pitch_type', 'pitch_name',
  'release_speed', 'effective_speed', 'release_spin_rate', 'spin_axis',
  'ihb', 'ivb', 'pfx_x', 'pfx_z',
  'plate_x', 'plate_z', 'zone', 'sz_top', 'sz_bot',
  'release_pos_x', 'release_pos_z', 'release_pos_y', 'release_extension',
  'tunnel_x', 'tunnel_z',
  'balls', 'strikes', 'outs_when_up', 'on_1b', 'on_2b', 'on_3b',
  'stand', 'p_throws', 'batter', 'pitcher', 'player_name',
  'type', 'description', 'events', 'bb_type', 'hit_location',
  'launch_speed', 'launch_angle', 'hit_distance_sc', 'hc_x', 'hc_y',
  'estimated_ba_using_speedangle', 'estimated_woba_using_speedangle',
  'woba_value', 'babip_value', 'iso_value', 'launch_speed_angle',
  'delta_run_exp', 'delta_home_win_exp',
  'vx0', 'vy0', 'vz0', 'ax', 'ay', 'az',
  'home_team', 'away_team', 'bat_score', 'fld_score',
  'post_bat_score', 'post_fld_score', 'game_type', 'game_year',
  'if_fielding_alignment', 'of_fielding_alignment',
]

interface Props {
  pitches: StatcastPitch[]
  lastName: string
  startDate: string
  endDate: string
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return isNaN(v) ? '' : Number.isInteger(v) ? String(v) : v.toFixed(3)
  return String(v)
}

function exportCSV(pitches: StatcastPitch[], allCols: string[], lastName: string, start: string, end: string) {
  if (!pitches.length) return
  const header = allCols.join(',')
  const rows = pitches.map(p => {
    const raw = p as Record<string, unknown>
    return allCols.map(k => {
      const v = raw[k]
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `statcast_${lastName || 'pitcher'}_${start}_${end}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PitchTable({ pitches, lastName, startDate, endDate }: Props) {
  const [page, setPage]           = useState(0)
  const [sortCol, setSortCol]     = useState<string>('game_date')
  const [sortAsc, setSortAsc]     = useState(false)
  const [search, setSearch]       = useState('')
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [showColPicker, setShowColPicker] = useState(false)

  // All columns in canonical order, with any extra at the end
  const allColumns = useMemo(() => {
    if (pitches.length === 0) return ORDERED_COLS
    const keys = Object.keys(pitches[0])
    const ordered = ORDERED_COLS.filter(c => keys.includes(c))
    const extra   = keys.filter(c => !ORDERED_COLS.includes(c))
    return [...ordered, ...extra]
  }, [pitches])

  const visibleColumns = useMemo(
    () => allColumns.filter(c => !hiddenCols.has(c)),
    [allColumns, hiddenCols]
  )

  const filtered = useMemo(() => {
    if (!search) return pitches
    const q = search.toLowerCase()
    return pitches.filter(p =>
      [p.pitch_type, p.description, p.events, p.game_date]
        .some(v => v && String(v).toLowerCase().includes(q))
    )
  }, [pitches, search])

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortCol]
      const bv = (b as Record<string, unknown>)[sortCol]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortAsc ? cmp : -cmp
    })
  }, [filtered, sortCol, sortAsc])

  const pages = Math.ceil(sorted.length / PAGE_SIZE)
  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = useCallback((col: string) => {
    if (sortCol === col) setSortAsc(v => !v)
    else { setSortCol(col); setSortAsc(true) }
    setPage(0)
  }, [sortCol])

  const toggleCol = (col: string) => {
    setHiddenCols(prev => {
      const next = new Set(prev)
      next.has(col) ? next.delete(col) : next.add(col)
      return next
    })
  }

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Pitch Log</div>
  }

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <input
          type="text" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Filter by type, description, event, date..."
          className="flex-1 min-w-0 bg-navy-800 border border-navy-600 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <div className="relative">
          <button
            onClick={() => setShowColPicker(v => !v)}
            className="px-3 py-1.5 rounded border border-navy-600 text-xs text-slate-300 hover:bg-navy-800 hover:text-white transition-colors whitespace-nowrap"
          >
            Columns {hiddenCols.size > 0 ? `(${hiddenCols.size} hidden)` : ''}
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-navy-900 border border-navy-600 rounded shadow-xl p-2 w-56 max-h-80 overflow-auto">
              <div className="text-xs text-slate-500 mb-1.5 px-1">Toggle columns</div>
              {allColumns.map(col => (
                <label key={col} className="flex items-center gap-2 px-1 py-0.5 hover:bg-navy-800 rounded cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(col)}
                    onChange={() => toggleCol(col)}
                    className="accent-blue-500"
                  />
                  <span className="text-slate-300 font-mono truncate">{col}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => exportCSV(pitches, allColumns, lastName, startDate, endDate)}
          className="px-3 py-1.5 rounded border border-navy-600 text-xs text-slate-300 hover:bg-navy-800 hover:text-white transition-colors whitespace-nowrap"
        >
          Export CSV
        </button>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {sorted.length.toLocaleString()} rows · {visibleColumns.length} cols
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="text-xs border-collapse min-w-full">
          <thead className="sticky top-0 bg-navy-900 z-10">
            <tr>
              {visibleColumns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="text-left px-2 py-2 font-mono text-slate-400 cursor-pointer hover:text-white whitespace-nowrap border-b border-navy-700 select-none"
                >
                  {col}
                  {sortCol === col && (
                    <span className="ml-1 text-blue-400">{sortAsc ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((p, i) => (
              <tr key={i} className="border-b border-navy-900 hover:bg-navy-800/40">
                {visibleColumns.map(col => {
                  const v = (p as Record<string, unknown>)[col]
                  return (
                    <td key={col} className="px-2 py-1 whitespace-nowrap font-mono">
                      {col === 'pitch_type' ? (
                        <span style={{ color: pitchColor(String(v ?? '')) }}>{fmt(v)}</span>
                      ) : (
                        <span className="text-slate-300">{fmt(v)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between shrink-0 text-xs text-slate-400">
        <button
          onClick={() => setPage(v => Math.max(0, v - 1))}
          disabled={page === 0}
          className="px-3 py-1 rounded bg-navy-800 disabled:opacity-30 hover:bg-navy-700"
        >
          Previous
        </button>
        <span>
          Showing {sorted.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of{' '}
          {sorted.length.toLocaleString()} pitches
        </span>
        <button
          onClick={() => setPage(v => Math.min(pages - 1, v + 1))}
          disabled={page >= pages - 1}
          className="px-3 py-1 rounded bg-navy-800 disabled:opacity-30 hover:bg-navy-700"
        >
          Next
        </button>
      </div>
    </div>
  )
}
