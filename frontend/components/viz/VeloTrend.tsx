'use client'
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { pitchColor } from '@/lib/colors'
import type { StatcastPitch } from '@/lib/types'

type Mode = 'inning' | 'sequence'
type Metric = 'velo' | 'spin'

interface Props { pitches: StatcastPitch[]; gamePk: number | null }

export default function VeloTrend({ pitches, gamePk }: Props) {
  const [mode, setMode] = useState<Mode>(gamePk ? 'sequence' : 'inning')
  const [metric, setMetric] = useState<Metric>('velo')

  const pitchTypes = useMemo(
    () => [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort(),
    [pitches]
  )

  const getVal = (p: StatcastPitch) =>
    metric === 'velo' ? p.release_speed : p.release_spin_rate

  const byInningData = useMemo(() => {
    const map: Record<string, Record<number, number[]>> = {}
    for (const p of pitches) {
      const v = getVal(p)
      if (v === null) continue
      if (!map[p.pitch_type]) map[p.pitch_type] = {}
      if (!map[p.pitch_type][p.inning]) map[p.pitch_type][p.inning] = []
      map[p.pitch_type][p.inning].push(v)
    }
    const innings = [...new Set(pitches.map(p => p.inning))].sort((a, b) => a - b)
    return innings.map(inn => {
      const row: Record<string, number | null> = { inning: inn }
      for (const [type, byInn] of Object.entries(map)) {
        const vals = byInn[inn]
        row[type] = vals ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }
      return row
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitches, metric])

  const bySeqData = useMemo(() => {
    const sorted = [...pitches]
      .filter(p => getVal(p) !== null)
      .sort((a, b) => {
        if (a.at_bat_number !== b.at_bat_number) return a.at_bat_number - b.at_bat_number
        return a.pitch_number - b.pitch_number
      })
    return sorted.map((p, i) => ({
      seq: i + 1,
      val: getVal(p),
      pitch_type: p.pitch_type,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitches, metric])

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Velo Trend</div>
  }

  const yLabel = metric === 'velo' ? 'Velocity (mph)' : 'Spin Rate (rpm)'

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-base font-semibold text-white">
          {metric === 'velo' ? 'Velocity' : 'Spin Rate'} Trend
        </h2>
        <div className="flex gap-2">
          <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
            {([['inning', 'By Inning'], ['sequence', 'By Pitch']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)}
                className={`px-2 py-1 ${mode === v ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
            {([['velo', 'Velo'], ['spin', 'Spin']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setMetric(v)}
                className={`px-2 py-1 ${metric === v ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {mode === 'inning' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byInningData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
              <XAxis dataKey="inning" tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Inning', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#cbd5e1' }}
                formatter={(v: number) => [metric === 'velo' ? v.toFixed(1) + ' mph' : v.toFixed(0) + ' rpm', '']}
              />
              <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
              {pitchTypes.map(type => (
                <Line
                  key={type} type="monotone" dataKey={type} name={type}
                  stroke={pitchColor(type)} strokeWidth={2} dot={false}
                  connectNulls activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
              <XAxis dataKey="seq" name="Pitch #" tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Pitch Sequence', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="val" tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#cbd5e1' }}
              />
              {pitchTypes.map(type => (
                <Scatter
                  key={type} name={type}
                  data={bySeqData.filter(d => d.pitch_type === type)}
                  fill={pitchColor(type)} fillOpacity={0.7}
                />
              ))}
              <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
