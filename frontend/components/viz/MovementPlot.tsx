'use client'
import { useMemo, useState, type ReactNode } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import { pitchColor, pitchName } from '@/lib/colors'
import { describeFilters, avg } from '@/lib/filters'
import { stdDev } from '@/lib/metrics'
import ExportMenu from '@/components/table/ExportMenu'
import type { StatcastPitch, PitchFilters } from '@/lib/types'

interface Props { pitches: StatcastPitch[]; filters?: PitchFilters }

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: StatcastPitch }[] }) => {
  if (!active || !payload?.[0]) return null
  const p = payload[0].payload
  return (
    <div className="bg-navy-900 border border-navy-600 rounded px-3 py-2 text-xs space-y-1">
      <div className="font-semibold text-white">{p.pitch_name || p.pitch_type}</div>
      <div className="text-slate-300">Velo: {p.release_speed?.toFixed(1) ?? '—'} mph</div>
      <div className="text-slate-300">Spin: {p.release_spin_rate?.toFixed(0) ?? '—'} rpm</div>
      <div className="text-slate-300">IHB: {p.ihb?.toFixed(1) ?? '—'}"</div>
      <div className="text-slate-300">IVB: {p.ivb?.toFixed(1) ?? '—'}"</div>
    </div>
  )
}

export default function MovementPlot({ pitches, filters }: Props) {
  const [pov, setPov] = useState<'pitcher' | 'catcher'>('pitcher')

  const groups = useMemo(() => {
    const g: Record<string, { x: number; y: number; pitch_name: string; release_speed: number | null; release_spin_rate: number | null; ihb: number | null; ivb: number | null; pitch_type: string }[]> = {}
    for (const p of pitches) {
      if (p.ihb === null || p.ivb === null) continue
      if (!g[p.pitch_type]) g[p.pitch_type] = []
      g[p.pitch_type].push({
        x: pov === 'pitcher' ? p.ihb : -(p.ihb),
        y: p.ivb,
        pitch_name: p.pitch_name,
        release_speed: p.release_speed,
        release_spin_rate: p.release_spin_rate,
        ihb: p.ihb,
        ivb: p.ivb,
        pitch_type: p.pitch_type,
      })
    }
    return g
  }, [pitches, pov])

  const total = pitches.filter(p => p.ihb !== null).length
  const typeCounts = Object.fromEntries(Object.entries(groups).map(([t, pts]) => [t, pts.length]))

  const summary = useMemo(() => {
    const types = [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort()
    return types.map(type => {
      const g = pitches.filter(p => p.pitch_type === type)
      return {
        pitch_type: type,
        count: g.length,
        avg_ihb: avg(g.map(p => p.ihb)),
        avg_ivb: avg(g.map(p => p.ivb)),
        ihb_sd: stdDev(g.map(p => p.ihb)),
        ivb_sd: stdDev(g.map(p => p.ivb)),
        avg_velo: avg(g.map(p => p.release_speed)),
      }
    }).sort((a, b) => b.count - a.count)
  }, [pitches])

  if (pitches.length === 0) {
    return <EmptyState label="Movement Plot" />
  }

  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title="Pitch Movement"
        subtitle={filters ? describeFilters(pitches, filters) : undefined}
        count={total}
      >
        <div className="flex items-center gap-2">
          <Toggle
            options={[{ value: 'pitcher', label: 'Pitcher POV' }, { value: 'catcher', label: 'Catcher POV' }]}
            value={pov}
            onChange={v => setPov(v as 'pitcher' | 'catcher')}
          />
          <ExportMenu rows={summary} filenameBase="movement_by_pitch_type" label="Export" />
        </div>
      </PanelHeader>

      <div className="flex-[2] min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
            <XAxis
              type="number" dataKey="x" name="IHB"
              domain={[-25, 25]} tickCount={11}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: `IHB (in, ${pov === 'pitcher' ? 'pitcher' : 'catcher'} POV)`, position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="y" name="IVB"
              domain={[-25, 25]} tickCount={11}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'IVB (in)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
            />
            <ReferenceLine x={0} stroke="#334155" strokeWidth={1.5} />
            <ReferenceLine y={0} stroke="#334155" strokeWidth={1.5} />
            <Tooltip content={<CustomTooltip />} />
            {Object.entries(groups).map(([type, pts]) => (
              <Scatter
                key={type}
                name={`${type} (${typeCounts[type]})`}
                data={pts}
                fill={pitchColor(type)}
                fillOpacity={0.75}
              />
            ))}
            <Legend
              formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{value}</span>}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 shrink-0 overflow-auto" style={{ maxHeight: '9rem' }}>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-navy-900">
            <tr className="border-b border-navy-700 text-slate-500">
              <th className="text-left pb-1.5 px-2">Type</th>
              <th className="text-right pb-1.5 px-2">N</th>
              <th className="text-right pb-1.5 px-2">Avg IHB</th>
              <th className="text-right pb-1.5 px-2">IHB SD</th>
              <th className="text-right pb-1.5 px-2">Avg IVB</th>
              <th className="text-right pb-1.5 px-2">IVB SD</th>
              <th className="text-right pb-1.5 px-2">Avg Velo</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(s => (
              <tr key={s.pitch_type} className="border-b border-navy-800">
                <td className="py-1 px-2" style={{ color: pitchColor(s.pitch_type) }}>{s.pitch_type}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.count}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.avg_ihb?.toFixed(1) ?? '—'}"</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.ihb_sd?.toFixed(2) ?? '—'}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.avg_ivb?.toFixed(1) ?? '—'}"</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.ivb_sd?.toFixed(2) ?? '—'}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.avg_velo?.toFixed(1) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PanelHeader({ title, subtitle, count, children }: {
  title: string; subtitle?: string; count?: number; children?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-3 shrink-0">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}{count !== undefined ? ` · ${count.toLocaleString()} pitches` : ''}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded overflow-hidden border border-navy-600 text-xs">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2 py-1 transition-colors ${value === o.value ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
      Load pitcher data to see {label}
    </div>
  )
}
