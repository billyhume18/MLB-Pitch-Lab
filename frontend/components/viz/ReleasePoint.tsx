'use client'
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Customized,
  LineChart, Line,
} from 'recharts'
import { pitchColor } from '@/lib/colors'
import { stdDev } from '@/lib/metrics'
import type { StatcastPitch } from '@/lib/types'

// Release-point standard deviation per outing, across all pitch types
// combined — a sudden jump can precede injury or flag a mechanical change.
function useConsistencyTrend(pitches: StatcastPitch[]) {
  return useMemo(() => {
    const byGame = new Map<number, StatcastPitch[]>()
    for (const p of pitches) {
      if (p.release_pos_x === null || p.release_pos_z === null) continue
      if (!byGame.has(p.game_pk)) byGame.set(p.game_pk, [])
      byGame.get(p.game_pk)!.push(p)
    }
    return [...byGame.entries()]
      .map(([game_pk, rows]) => ({
        game_pk,
        game_date: rows[0].game_date,
        relXSd: stdDev(rows.map(r => r.release_pos_x)),
        relZSd: stdDev(rows.map(r => r.release_pos_z)),
      }))
      .filter(r => r.relXSd !== null && r.relZSd !== null)
      .sort((a, b) => a.game_date.localeCompare(b.game_date))
  }, [pitches])
}

type Mode = 'type' | 'inning'

interface Props { pitches: StatcastPitch[] }

function computeEllipse(pts: { x: number; y: number }[]) {
  if (pts.length < 5) return null
  const n = pts.length
  const mx = pts.reduce((s, p) => s + p.x, 0) / n
  const my = pts.reduce((s, p) => s + p.y, 0) / n
  const cxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0) / (n - 1)
  const cyy = pts.reduce((s, p) => s + (p.y - my) ** 2, 0) / (n - 1)
  const cxy = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / (n - 1)
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const d = Math.sqrt(Math.max(0, (trace / 2) ** 2 - det))
  return {
    cx: mx, cy: my,
    rx: Math.sqrt(Math.max(0, trace / 2 + d)),
    ry: Math.sqrt(Math.max(0, trace / 2 - d)),
    rotation: (Math.atan2(2 * cxy, cxx - cyy) / 2) * (180 / Math.PI),
  }
}

const EllipseOverlay = ({ xAxisMap, yAxisMap, ellipses }: {
  xAxisMap?: Record<string, { scale: (v: number) => number }>
  yAxisMap?: Record<string, { scale: (v: number) => number }>
  ellipses: Array<{ type: string; cx: number; cy: number; rx: number; ry: number; rotation: number }>
}) => {
  if (!xAxisMap?.['0'] || !yAxisMap?.['0']) return null
  const xs = xAxisMap['0'].scale
  const ys = yAxisMap['0'].scale
  return (
    <g>
      {ellipses.map(e => {
        const cx = xs(e.cx)
        const cy = ys(e.cy)
        const rx = Math.abs(xs(e.cx + e.rx) - cx)
        const ry = Math.abs(ys(e.cy + e.ry) - cy)
        return (
          <ellipse key={e.type} cx={cx} cy={cy} rx={rx} ry={ry}
            transform={`rotate(${-e.rotation}, ${cx}, ${cy})`}
            fill={pitchColor(e.type)} fillOpacity={0.08}
            stroke={pitchColor(e.type)} strokeWidth={1.5} strokeDasharray="4 4" />
        )
      })}
    </g>
  )
}

export default function ReleasePoint({ pitches }: Props) {
  const [mode, setMode] = useState<Mode>('type')
  const [showEllipses, setShowEllipses] = useState(true)
  const trend = useConsistencyTrend(pitches)

  const maxInning = useMemo(() => Math.max(...pitches.map(p => p.inning), 1), [pitches])

  const getColor = (p: StatcastPitch) => {
    if (mode === 'type') return pitchColor(p.pitch_type)
    const t = (p.inning - 1) / Math.max(maxInning - 1, 1)
    const r = Math.round(t * 239 + (1 - t) * 59)
    const g = Math.round((1 - t) * 130 + t * 68)
    const b = Math.round((1 - t) * 246 + t * 68)
    return `rgb(${r},${g},${b})`
  }

  const groups = useMemo(() => {
    const g: Record<string, { x: number; y: number; color: string; inning: number }[]> = {}
    for (const p of pitches) {
      if (p.release_pos_x === null || p.release_pos_z === null) continue
      const key = mode === 'type' ? p.pitch_type : `inn${p.inning}`
      if (!g[key]) g[key] = []
      g[key].push({ x: p.release_pos_x, y: p.release_pos_z, color: getColor(p), inning: p.inning })
    }
    return g
  }, [pitches, mode, maxInning])

  const ellipses = useMemo(() => {
    if (mode !== 'type' || !showEllipses) return []
    return Object.entries(groups)
      .map(([type, pts]) => {
        const e = computeEllipse(pts)
        return e ? { type, ...e } : null
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
  }, [groups, mode, showEllipses])

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Release Point</div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-base font-semibold text-white">Release Point Consistency</h2>
        <div className="flex gap-2 items-center">
          {mode === 'type' && (
            <button
              onClick={() => setShowEllipses(v => !v)}
              className={`text-xs px-2 py-1 rounded border ${showEllipses ? 'border-blue-500 text-blue-400' : 'border-navy-600 text-slate-400'}`}
            >
              1σ ellipses
            </button>
          )}
          <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
            {([['type', 'By Type'], ['inning', 'By Inning']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)}
                className={`px-2 py-1 ${mode === v ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
            <XAxis type="number" dataKey="x" name="Horiz Position"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Release X (ft)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Vert Position"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Release Z (ft)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
              itemStyle={{ color: '#cbd5e1' }}
              formatter={(v: number) => [v.toFixed(3) + ' ft', '']}
            />
            {mode === 'type' ? (
              <>
                {Object.entries(groups).map(([type, pts]) => (
                  <Scatter key={type} name={type} data={pts} fill={pitchColor(type)} fillOpacity={0.6} />
                ))}
                <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
                {showEllipses && (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <Customized component={(props: any) =>
                    <EllipseOverlay {...props} ellipses={ellipses} />}
                  />
                )}
              </>
            ) : (
              <>
                {Object.entries(groups).map(([key, pts]) => (
                  <Scatter key={key} name={key} data={pts}
                    fill={pts[0]?.color ?? '#64748b'} fillOpacity={0.6}
                    legendType="none" />
                ))}
                <div />
              </>
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {mode === 'inning' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 shrink-0">
          <span>Early innings</span>
          <div className="flex-1 h-2 rounded" style={{ background: 'linear-gradient(to right, #3b82f6, #ef4444)' }} />
          <span>Late innings</span>
        </div>
      )}

      {trend.length >= 2 && (
        <div className="mt-3 h-32 shrink-0">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            Release-Point Std Dev by Outing (mechanical consistency over time)
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
              <XAxis dataKey="game_date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Std dev (ft)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
                itemStyle={{ color: '#cbd5e1' }}
                formatter={(v: number) => [v.toFixed(3) + ' ft', '']}
              />
              <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
              <Line type="monotone" dataKey="relXSd" name="Release X SD" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="relZSd" name="Release Z SD" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
