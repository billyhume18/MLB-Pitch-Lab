'use client'
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { pitchColor } from '@/lib/colors'
import type { StatcastPitch } from '@/lib/types'

type View = 'tunnel' | 'plate'

interface Props { pitches: StatcastPitch[] }

export default function TunnelingPlot({ pitches }: Props) {
  const [view, setView] = useState<View>('tunnel')

  const groups = useMemo(() => {
    const g: Record<string, { x: number; y: number }[]> = {}
    for (const p of pitches) {
      const x = view === 'tunnel' ? p.tunnel_x : p.plate_x
      const y = view === 'tunnel' ? p.tunnel_z : p.plate_z
      if (x === null || y === null) continue
      if (!g[p.pitch_type]) g[p.pitch_type] = []
      g[p.pitch_type].push({ x, y })
    }
    return g
  }, [pitches, view])

  const distances = useMemo(() => {
    const types = Object.keys(groups)
    const centroids: Record<string, { x: number; y: number } | null> = {}
    for (const [type, pts] of Object.entries(groups)) {
      if (pts.length === 0) { centroids[type] = null; continue }
      centroids[type] = {
        x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
        y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
      }
    }
    const pairs: Array<{ a: string; b: string; dist: number }> = []
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const ca = centroids[types[i]]
        const cb = centroids[types[j]]
        if (!ca || !cb) continue
        const dist = Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2)
        pairs.push({ a: types[i], b: types[j], dist })
      }
    }
    return pairs.sort((a, b) => a.dist - b.dist)
  }, [groups])

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Tunneling</div>
  }

  const xLabel = view === 'tunnel' ? 'Tunnel X (ft at 20ft)' : 'Plate X (ft)'
  const yLabel = view === 'tunnel' ? 'Tunnel Z (ft at 20ft)' : 'Plate Z (ft)'

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-white">Tunneling Analysis</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {view === 'tunnel' ? 'Pitch location at decision point (~20 ft from plate)' : 'Pitch location at plate'}
          </p>
        </div>
        <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
          {([['tunnel', 'At Tunnel (~20ft)'], ['plate', 'At Plate']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2 py-1 ${view === v ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
              <XAxis type="number" dataKey="x" tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
              <YAxis type="number" dataKey="y" tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
                itemStyle={{ color: '#cbd5e1' }}
                formatter={(v: number) => [v.toFixed(3) + ' ft', '']}
              />
              {Object.entries(groups).map(([type, pts]) => (
                <Scatter key={type} name={`${type} (${pts.length})`} data={pts}
                  fill={pitchColor(type)} fillOpacity={0.7} />
              ))}
              <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {distances.length > 0 && (
          <div className="w-48 shrink-0 overflow-auto">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Centroid Distances (ft)</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-navy-700">
                  <th className="text-left pb-1">Pair</th>
                  <th className="text-right pb-1">Dist</th>
                </tr>
              </thead>
              <tbody>
                {distances.map(({ a, b, dist }) => (
                  <tr key={`${a}-${b}`} className="border-b border-navy-800">
                    <td className="py-1">
                      <span style={{ color: pitchColor(a) }}>{a}</span>
                      <span className="text-slate-500"> / </span>
                      <span style={{ color: pitchColor(b) }}>{b}</span>
                    </td>
                    <td className="text-right text-slate-300 font-mono">{dist.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
