'use client'
import { useMemo, useState, type ReactNode } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import { pitchColor, pitchName } from '@/lib/colors'
import { describeFilters } from '@/lib/filters'
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
        <Toggle
          options={[{ value: 'pitcher', label: 'Pitcher POV' }, { value: 'catcher', label: 'Catcher POV' }]}
          value={pov}
          onChange={v => setPov(v as 'pitcher' | 'catcher')}
        />
      </PanelHeader>

      <div className="flex-1 min-h-0">
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
