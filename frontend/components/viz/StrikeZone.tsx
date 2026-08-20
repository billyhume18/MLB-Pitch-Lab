'use client'
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Legend, Customized,
} from 'recharts'
import { pitchColor } from '@/lib/colors'
import { calcWhiffPct, calcCSWPct } from '@/lib/filters'
import ExportMenu from '@/components/table/ExportMenu'
import type { StatcastPitch } from '@/lib/types'

// Statcast zone codes: 1-9 = in-zone 3x3 grid (1-3 top row, 4-6 mid, 7-9
// bottom, each row left-to-right from the pitcher's view), 11-14 = the four
// out-of-zone quadrants (11 up-left … 14 down-right).
const ZONE_LABELS: Record<number, string> = {
  1: 'Up-In', 2: 'Up-Mid', 3: 'Up-Away',
  4: 'Mid-In', 5: 'Heart', 6: 'Mid-Away',
  7: 'Down-In', 8: 'Down-Mid', 9: 'Down-Away',
  11: 'Chase Up-In', 12: 'Chase Up-Away', 13: 'Chase Down-In', 14: 'Chase Down-Away',
}
const ZONE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14]

type Filter = 'all' | 'called_strike' | 'swinging_strike' | 'hit_into_play' | 'ball'
type ViewMode = 'scatter' | 'heatmap'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'called_strike', label: 'Called K' },
  { value: 'swinging_strike', label: 'Whiffs' },
  { value: 'hit_into_play', label: 'In Play' },
  { value: 'ball', label: 'Balls' },
]

interface Props { pitches: StatcastPitch[] }

const HEAT_CELL = 0.25 // ft
const HEAT_X_MIN = -2, HEAT_X_MAX = 2
const HEAT_Y_MIN = 0,  HEAT_Y_MAX = 5

function heatColor(t: number): string {
  // 0 = transparent navy, 1 = hot red, through blue -> yellow -> red
  if (t <= 0) return 'rgba(30,58,95,0)'
  const stops: Array<[number, [number, number, number]]> = [
    [0.00, [30, 64, 175]],
    [0.35, [59, 130, 246]],
    [0.65, [245, 158, 11]],
    [1.00, [239, 68, 68]],
  ]
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  const span = hi[0] - lo[0] || 1
  const frac = (t - lo[0]) / span
  const [r1, g1, b1] = lo[1], [r2, g2, b2] = hi[1]
  const r = Math.round(r1 + (r2 - r1) * frac)
  const g = Math.round(g1 + (g2 - g1) * frac)
  const b = Math.round(b1 + (b2 - b1) * frac)
  return `rgba(${r},${g},${b},${0.25 + 0.65 * t})`
}

const HeatmapOverlay = ({ xAxisMap, yAxisMap, cells }: {
  xAxisMap?: Record<string, { scale: (v: number) => number }>
  yAxisMap?: Record<string, { scale: (v: number) => number }>
  cells: Array<{ x: number; y: number; density: number }>
}) => {
  if (!xAxisMap?.['0'] || !yAxisMap?.['0']) return null
  const xs = xAxisMap['0'].scale
  const ys = yAxisMap['0'].scale
  const w = Math.abs(xs(HEAT_X_MIN + HEAT_CELL) - xs(HEAT_X_MIN))
  const h = Math.abs(ys(HEAT_Y_MIN) - ys(HEAT_Y_MIN + HEAT_CELL))
  return (
    <g>
      {cells.map((c, i) => (
        <rect
          key={i}
          x={xs(c.x)} y={ys(c.y + HEAT_CELL)}
          width={w} height={h}
          fill={heatColor(c.density)}
        />
      ))}
    </g>
  )
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: StatcastPitch }[] }) => {
  if (!active || !payload?.[0]) return null
  const p = payload[0].payload
  return (
    <div className="bg-navy-900 border border-navy-600 rounded px-3 py-2 text-xs space-y-1">
      <div className="font-semibold text-white">{p.pitch_name || p.pitch_type}</div>
      <div className="text-slate-300">{p.description}</div>
      <div className="text-slate-300">Location: ({p.plate_x?.toFixed(2)}, {p.plate_z?.toFixed(2)})</div>
      <div className="text-slate-300">Count: {p.balls}-{p.strikes}</div>
    </div>
  )
}

export default function StrikeZone({ pitches }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('scatter')
  const [heatmapType, setHeatmapType] = useState<string>('')

  const pitchTypes = useMemo(
    () => [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort(),
    [pitches]
  )

  const { groups, shown, szBot, szTop } = useMemo(() => {
    const valid = pitches.filter(p => p.plate_x !== null && p.plate_z !== null)
    const szBots = valid.map(p => p.sz_bot).filter((v): v is number => v !== null)
    const szTops = valid.map(p => p.sz_top).filter((v): v is number => v !== null)
    const bot = szBots.length ? szBots.reduce((a, b) => a + b, 0) / szBots.length : 1.5
    const top = szTops.length ? szTops.reduce((a, b) => a + b, 0) / szTops.length : 3.5

    const filtered = valid.filter(p => {
      if (filter === 'all') return true
      if (filter === 'called_strike') return p.description === 'called_strike'
      if (filter === 'swinging_strike') return p.description?.startsWith('swinging_strike')
      if (filter === 'hit_into_play') return p.description?.startsWith('hit_into_play')
      if (filter === 'ball') return p.type === 'B'
      return true
    })

    const g: Record<string, { x: number; y: number }[]> = {}
    for (const p of filtered) {
      if (!g[p.pitch_type]) g[p.pitch_type] = []
      g[p.pitch_type].push({ x: p.plate_x!, y: p.plate_z! })
    }
    return { groups: g, shown: filtered, szBot: bot, szTop: top }
  }, [pitches, filter])

  const heatCells = useMemo(() => {
    if (viewMode !== 'heatmap') return []
    const rows = heatmapType ? shown.filter(p => p.pitch_type === heatmapType) : shown
    const counts = new Map<string, number>()
    for (const p of rows) {
      const cx = Math.floor((p.plate_x! - HEAT_X_MIN) / HEAT_CELL) * HEAT_CELL + HEAT_X_MIN
      const cy = Math.floor((p.plate_z! - HEAT_Y_MIN) / HEAT_CELL) * HEAT_CELL + HEAT_Y_MIN
      if (cx < HEAT_X_MIN || cx >= HEAT_X_MAX || cy < HEAT_Y_MIN || cy >= HEAT_Y_MAX) continue
      const key = `${cx.toFixed(2)},${cy.toFixed(2)}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const max = Math.max(1, ...counts.values())
    return [...counts.entries()].map(([key, count]) => {
      const [x, y] = key.split(',').map(Number)
      return { x, y, density: count / max }
    })
  }, [shown, viewMode, heatmapType])

  const zoneSummary = useMemo(() => {
    const total = shown.length
    return ZONE_ORDER.map(z => {
      const rows = shown.filter(p => p.zone === z)
      return {
        zone: z,
        label: ZONE_LABELS[z],
        count: rows.length,
        pct: total > 0 ? rows.length / total : null,
        whiffPct: calcWhiffPct(rows),
        cswPct: calcCSWPct(rows),
      }
    }).filter(r => r.count > 0)
  }, [shown])

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Strike Zone</div>
  }

  const szL = -17 / 24   // -0.708 ft
  const szR =  17 / 24   //  0.708 ft
  const zoneW = (szR - szL) / 3
  const zoneH = (szTop - szBot) / 3

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-white">Strike Zone</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
            {(['scatter', 'heatmap'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-2 py-1 capitalize ${viewMode === v ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
                {v}
              </button>
            ))}
          </div>
          {viewMode === 'heatmap' && pitchTypes.length > 0 && (
            <select
              value={heatmapType}
              onChange={e => setHeatmapType(e.target.value)}
              className="bg-navy-800 border border-navy-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All pitch types</option>
              {pitchTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-2 py-1 ${filter === f.value ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ExportMenu rows={zoneSummary} filenameBase="strike_zone_summary" label="Export" />
        </div>
      </div>
      {/* Plate is 4ft (x) by 5ft (y) of real space — lock the container to that
          aspect ratio so 1ft renders as the same pixel distance on both axes. */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div style={{ aspectRatio: '4 / 5', height: '100%', maxWidth: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
            <XAxis
              type="number" dataKey="x" domain={[-2, 2]} tickCount={9} allowDataOverflow
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Plate X (ft)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="y" domain={[0, 5]} tickCount={6} allowDataOverflow
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Height (ft)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
            />
            {viewMode === 'heatmap' && (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Customized component={(props: any) => <HeatmapOverlay {...props} cells={heatCells} />} />
            )}
            {/* Strike zone rectangle */}
            <ReferenceArea x1={szL} x2={szR} y1={szBot} y2={szTop} fill="#ffffff" fillOpacity={0.04} stroke="#f8fafc" strokeWidth={2.5} />
            {/* Inner 3x3 grid (full-span lines within chart area) */}
            <ReferenceLine x={szL + zoneW} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
            <ReferenceLine x={szL + 2 * zoneW} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
            <ReferenceLine y={szBot + zoneH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
            <ReferenceLine y={szBot + 2 * zoneH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
            <ReferenceLine x={0} stroke="#334155" />
            <Tooltip content={<CustomTooltip />} />
            {viewMode === 'scatter' && Object.entries(groups).map(([type, pts]) => (
              <Scatter
                key={type}
                name={`${type} (${pts.length})`}
                data={pts}
                fill={pitchColor(type)}
                fillOpacity={0.7}
              />
            ))}
            {viewMode === 'scatter' && (
              <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 shrink-0 overflow-auto" style={{ maxHeight: '9rem' }}>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-navy-900">
            <tr className="border-b border-navy-700 text-slate-500">
              <th className="text-left pb-1.5 px-2">Zone</th>
              <th className="text-right pb-1.5 px-2">N</th>
              <th className="text-right pb-1.5 px-2">%</th>
              <th className="text-right pb-1.5 px-2">Whiff%</th>
              <th className="text-right pb-1.5 px-2">CSW%</th>
            </tr>
          </thead>
          <tbody>
            {zoneSummary.map(z => (
              <tr key={z.zone} className="border-b border-navy-800">
                <td className="py-1 px-2 text-slate-300">{z.label} <span className="text-slate-600">({z.zone})</span></td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{z.count}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{z.pct !== null ? (z.pct * 100).toFixed(1) + '%' : '—'}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{z.whiffPct !== null ? (z.whiffPct * 100).toFixed(1) + '%' : '—'}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{z.cswPct !== null ? (z.cswPct * 100).toFixed(1) + '%' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
