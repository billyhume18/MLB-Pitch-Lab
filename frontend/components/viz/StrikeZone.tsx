'use client'
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Legend,
} from 'recharts'
import { pitchColor } from '@/lib/colors'
import type { StatcastPitch } from '@/lib/types'

type Filter = 'all' | 'called_strike' | 'swinging_strike' | 'hit_into_play' | 'ball'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'called_strike', label: 'Called K' },
  { value: 'swinging_strike', label: 'Whiffs' },
  { value: 'hit_into_play', label: 'In Play' },
  { value: 'ball', label: 'Balls' },
]

interface Props { pitches: StatcastPitch[] }

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

  const { groups, szBot, szTop } = useMemo(() => {
    const valid = pitches.filter(p => p.plate_x !== null && p.plate_z !== null)
    const szBots = valid.map(p => p.sz_bot).filter((v): v is number => v !== null)
    const szTops = valid.map(p => p.sz_top).filter((v): v is number => v !== null)
    const bot = szBots.length ? szBots.reduce((a, b) => a + b, 0) / szBots.length : 1.5
    const top = szTops.length ? szTops.reduce((a, b) => a + b, 0) / szTops.length : 3.5

    const shown = valid.filter(p => {
      if (filter === 'all') return true
      if (filter === 'called_strike') return p.description === 'called_strike'
      if (filter === 'swinging_strike') return p.description?.startsWith('swinging_strike')
      if (filter === 'hit_into_play') return p.description?.startsWith('hit_into_play')
      if (filter === 'ball') return p.type === 'B'
      return true
    })

    const g: Record<string, { x: number; y: number }[]> = {}
    for (const p of shown) {
      if (!g[p.pitch_type]) g[p.pitch_type] = []
      g[p.pitch_type].push({ x: p.plate_x!, y: p.plate_z! })
    }
    return { groups: g, szBot: bot, szTop: top }
  }, [pitches, filter])

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Strike Zone</div>
  }

  const szL = -17 / 24   // -0.708 ft
  const szR =  17 / 24   //  0.708 ft
  const zoneW = (szR - szL) / 3
  const zoneH = (szTop - szBot) / 3

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-base font-semibold text-white">Strike Zone</h2>
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
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
            <XAxis
              type="number" dataKey="x" domain={[-2, 2]} tickCount={9}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Plate X (ft)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="y" domain={[0, 5]} tickCount={6}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Height (ft)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
            />
            {/* Strike zone rectangle */}
            <ReferenceArea x1={szL} x2={szR} y1={szBot} y2={szTop} fill="none" stroke="#ffffff" strokeWidth={1.5} />
            {/* Inner 3x3 grid (full-span lines within chart area) */}
            <ReferenceLine x={szL + zoneW} stroke="#475569" strokeWidth={0.5} />
            <ReferenceLine x={szL + 2 * zoneW} stroke="#475569" strokeWidth={0.5} />
            <ReferenceLine y={szBot + zoneH} stroke="#475569" strokeWidth={0.5} />
            <ReferenceLine y={szBot + 2 * zoneH} stroke="#475569" strokeWidth={0.5} />
            <ReferenceLine x={0} stroke="#334155" />
            <Tooltip content={<CustomTooltip />} />
            {Object.entries(groups).map(([type, pts]) => (
              <Scatter
                key={type}
                name={`${type} (${pts.length})`}
                data={pts}
                fill={pitchColor(type)}
                fillOpacity={0.7}
              />
            ))}
            <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
