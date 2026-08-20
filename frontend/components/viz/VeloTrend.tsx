'use client'
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { pitchColor } from '@/lib/colors'
import ExportMenu from '@/components/table/ExportMenu'
import type { StatcastPitch } from '@/lib/types'

type Mode = 'inning' | 'sequence'
type Metric = 'velo' | 'spin'

interface Props { pitches: StatcastPitch[]; gamePk: number | null }

// Pad the observed min/max by a fraction of the range (with a sane floor so a
// near-zero-variance outing still gets a few units of headroom either side),
// then round to a clean step so the axis doesn't end mid-tick.
function niceDomain(values: number[], step: number): [number, number] {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.15, step * 2)
  const min = Math.floor((lo - pad) / step) * step
  const max = Math.ceil((hi + pad) / step) * step
  return [min, max]
}

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

  const yDomain = useMemo(() => {
    const step = metric === 'velo' ? 1 : 25
    const values = mode === 'inning'
      ? byInningData.flatMap(row => pitchTypes.map(t => row[t]).filter((v): v is number => v !== null && v !== undefined))
      : bySeqData.map(d => d.val).filter((v): v is number => v !== null)
    if (values.length === 0) return undefined
    return niceDomain(values, step)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, metric, byInningData, bySeqData, pitchTypes])

  const exportRows = useMemo(() => {
    if (mode === 'inning') {
      return byInningData.map(row => {
        const out: Record<string, unknown> = { inning: row.inning }
        for (const t of pitchTypes) out[`${t}_${metric}`] = row[t] !== null && row[t] !== undefined ? Number((row[t] as number).toFixed(metric === 'velo' ? 2 : 0)) : null
        return out
      })
    }
    return bySeqData.map(d => ({
      pitch_sequence: d.seq,
      pitch_type: d.pitch_type,
      [metric === 'velo' ? 'release_speed' : 'release_spin_rate']: d.val,
    }))
  }, [mode, metric, byInningData, bySeqData, pitchTypes])

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
        <div className="flex gap-2 items-center">
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
          <ExportMenu rows={exportRows} filenameBase={`velo_trend_${mode}_${metric}`} label="Export" />
        </div>
      </div>

      <div className="flex-[2] min-h-0">
        {mode === 'inning' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byInningData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
              <XAxis dataKey="inning" tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Inning', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={yDomain} allowDataOverflow tick={{ fill: '#94a3b8', fontSize: 11 }}
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
              <YAxis dataKey="val" domain={yDomain} allowDataOverflow tick={{ fill: '#94a3b8', fontSize: 11 }}
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

      <div className="mt-3 shrink-0 overflow-auto" style={{ maxHeight: '9rem' }}>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-navy-900">
            {mode === 'inning' ? (
              <tr className="border-b border-navy-700 text-slate-500">
                <th className="text-left pb-1.5 px-2">Inning</th>
                {pitchTypes.map(t => (
                  <th key={t} className="text-right pb-1.5 px-2" style={{ color: pitchColor(t) }}>{t}</th>
                ))}
              </tr>
            ) : (
              <tr className="border-b border-navy-700 text-slate-500">
                <th className="text-left pb-1.5 px-2">Seq #</th>
                <th className="text-left pb-1.5 px-2">Type</th>
                <th className="text-right pb-1.5 px-2">{metric === 'velo' ? 'Velo (mph)' : 'Spin (rpm)'}</th>
              </tr>
            )}
          </thead>
          <tbody>
            {mode === 'inning' ? byInningData.map(row => (
              <tr key={String(row.inning)} className="border-b border-navy-800">
                <td className="py-1 px-2 text-slate-300">{row.inning}</td>
                {pitchTypes.map(t => (
                  <td key={t} className="py-1 px-2 text-right font-mono text-slate-300">
                    {row[t] !== null && row[t] !== undefined ? (row[t] as number).toFixed(metric === 'velo' ? 1 : 0) : '—'}
                  </td>
                ))}
              </tr>
            )) : bySeqData.map(d => (
              <tr key={d.seq} className="border-b border-navy-800">
                <td className="py-1 px-2 text-slate-300">{d.seq}</td>
                <td className="py-1 px-2" style={{ color: pitchColor(d.pitch_type) }}>{d.pitch_type}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">
                  {d.val !== null ? d.val.toFixed(metric === 'velo' ? 1 : 0) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
