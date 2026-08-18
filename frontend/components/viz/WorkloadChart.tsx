'use client'
import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { calcWorkload } from '@/lib/workload'
import type { StatcastPitch } from '@/lib/types'

interface Props { pitches: StatcastPitch[] }

export default function WorkloadChart({ pitches }: Props) {
  const workload = useMemo(() => calcWorkload(pitches), [pitches])

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Workload</div>
  }

  const spikeCount = workload.filter(w => w.spike).length

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div className="shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Pitch Count &amp; Workload Spikes</h2>
          {spikeCount > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-red-900/40 border border-red-700 text-red-300">
              {spikeCount} outing{spikeCount === 1 ? '' : 's'} flagged &gt;30% over rolling 3-outing average
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Bars = pitches thrown that outing (red = spike vs. the prior 3-outing rolling average). Line = cumulative season pitch count.
        </p>
      </div>

      <div className="h-80 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={workload} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
            <XAxis dataKey="game_date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis yAxisId="pitches" tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Pitches / outing', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
            <YAxis yAxisId="cumulative" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Cumulative season pitches', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#cbd5e1' }}
              formatter={(v: number, name: string) => [
                name === 'restDays' ? `${v ?? '—'} days` : v,
                name === 'pitchCount' ? 'Pitches' : name === 'cumulativeSeasonPitches' ? 'Cumulative' : name,
              ]}
            />
            <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
            <Bar yAxisId="pitches" dataKey="pitchCount" name="Pitches" radius={[2, 2, 0, 0]}>
              {workload.map((w, i) => (
                <Cell key={i} fill={w.spike ? '#ef4444' : '#3b82f6'} />
              ))}
            </Bar>
            <Line yAxisId="cumulative" type="monotone" dataKey="cumulativeSeasonPitches" name="Cumulative"
              stroke="#22c55e" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 min-h-0">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Rest Days Between Outings</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={workload} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
              <XAxis dataKey="game_date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Days rest', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#cbd5e1' }}
              />
              <Bar dataKey="restDays" name="Rest Days" fill="#a855f7" radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="shrink-0 overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="border-b border-navy-700 text-slate-500">
              <th className="text-left pb-1.5 px-2">Date</th>
              <th className="text-right pb-1.5 px-2">Pitches</th>
              <th className="text-right pb-1.5 px-2">Rest (d)</th>
              <th className="text-right pb-1.5 px-2">Rolling Avg (prev 3)</th>
              <th className="text-right pb-1.5 px-2">Cumulative</th>
              <th className="text-left pb-1.5 px-2">Flag</th>
            </tr>
          </thead>
          <tbody>
            {workload.map(w => (
              <tr key={w.game_pk} className={`border-b border-navy-800 ${w.spike ? 'bg-red-900/20' : ''}`}>
                <td className="py-1 px-2 text-slate-300">{w.game_date}</td>
                <td className="py-1 px-2 text-right text-slate-300 font-mono">{w.pitchCount}</td>
                <td className="py-1 px-2 text-right text-slate-300 font-mono">{w.restDays ?? '—'}</td>
                <td className="py-1 px-2 text-right text-slate-300 font-mono">{w.rollingAvgPrev3?.toFixed(1) ?? '—'}</td>
                <td className="py-1 px-2 text-right text-slate-300 font-mono">{w.cumulativeSeasonPitches}</td>
                <td className="py-1 px-2">
                  {w.spike && <span className="text-red-400 font-semibold">Spike</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
