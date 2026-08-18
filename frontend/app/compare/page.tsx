'use client'
import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell,
} from 'recharts'
import PlayerSearch from '@/components/controls/PlayerSearch'
import DateRangePicker from '@/components/controls/DateRangePicker'
import Spinner from '@/components/ui/Spinner'
import { fetchPitches } from '@/lib/api'
import { pitchColor, PITCHER_COLORS, pitchName } from '@/lib/colors'
import { avg, calcWhiffPct } from '@/lib/filters'
import type { StatcastPitch, PlayerSearchResult } from '@/lib/types'

const today = new Date().toISOString().slice(0, 10)
const defaultStart = `${new Date().getFullYear()}-03-01`

interface Slot {
  player: PlayerSearchResult | null
  startDate: string
  endDate: string
  pitches: StatcastPitch[]
  loading: boolean
  error: string | null
}

const emptySlot = (): Slot => ({
  player: null, startDate: defaultStart, endDate: today,
  pitches: [], loading: false, error: null,
})

type OverlayMode = 'pitcher' | 'type'

export default function ComparePage() {
  const [slots, setSlots] = useState<Slot[]>([emptySlot(), emptySlot()])
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('pitcher')
  const [activeView, setActiveView] = useState<'movement' | 'velo' | 'arsenal'>('movement')

  const setSlot = (i: number, patch: Partial<Slot>) =>
    setSlots(s => s.map((slot, idx) => idx === i ? { ...slot, ...patch } : slot))

  const addSlot = () => { if (slots.length < 4) setSlots(s => [...s, emptySlot()]) }
  const removeSlot = (i: number) => setSlots(s => s.filter((_, idx) => idx !== i))

  const loadSlot = async (i: number) => {
    const slot = slots[i]
    if (!slot.player) return
    setSlot(i, { loading: true, error: null, pitches: [] })
    try {
      const data = await fetchPitches(slot.player.key_mlbam, slot.startDate, slot.endDate)
      setSlot(i, { pitches: data.pitches ?? [], loading: false })
    } catch (e) {
      setSlot(i, { loading: false, error: e instanceof Error ? e.message : 'Load failed' })
    }
  }

  const loadedSlots = slots.filter(s => s.pitches.length > 0)

  const movementData = useMemo(() => {
    if (overlayMode === 'pitcher') {
      return loadedSlots.flatMap((slot, si) =>
        slot.pitches
          .filter(p => p.ihb !== null && p.ivb !== null)
          .map(p => ({ x: p.ihb!, y: p.ivb!, slotIdx: si, pitch_type: p.pitch_type }))
      )
    }
    return []
  }, [loadedSlots, overlayMode])

  const veloData = useMemo(() => {
    return loadedSlots.map((slot, si) => {
      const types = [...new Set(slot.pitches.map(p => p.pitch_type).filter(Boolean))]
      return types.map(t => {
        const group = slot.pitches.filter(p => p.pitch_type === t)
        return {
          label: `${slot.player!.name_last} ${t}`,
          velo: avg(group.map(p => p.release_speed)) ?? 0,
          slotIdx: si,
          type: t,
        }
      })
    }).flat()
  }, [loadedSlots])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Pitcher slots */}
      <div className="flex gap-3 p-4 border-b border-navy-700 overflow-x-auto shrink-0">
        {slots.map((slot, i) => (
          <div key={i} className="min-w-64 bg-navy-800 rounded-lg p-3 border border-navy-700 flex-1">
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PITCHER_COLORS[i] }}
              />
              {slots.length > 2 && (
                <button onClick={() => removeSlot(i)} className="text-slate-500 hover:text-red-400 text-xs">×</button>
              )}
            </div>
            <PlayerSearch
              selected={slot.player}
              onSelect={p => setSlot(i, { player: p })}
            />
            <div className="mt-2">
              <DateRangePicker
                startDate={slot.startDate} endDate={slot.endDate}
                onStartChange={d => setSlot(i, { startDate: d })}
                onEndChange={d => setSlot(i, { endDate: d })}
              />
            </div>
            <button
              onClick={() => loadSlot(i)}
              disabled={!slot.player || slot.loading}
              className="mt-2 w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium flex items-center justify-center gap-2"
            >
              {slot.loading ? <><Spinner size="sm" /> Loading...</> : 'Load'}
            </button>
            {slot.error && <div className="mt-1 text-xs text-red-400">{slot.error}</div>}
            {slot.pitches.length > 0 && (
              <div className="mt-1 text-xs text-slate-500 text-center">{slot.pitches.length.toLocaleString()} pitches</div>
            )}
          </div>
        ))}
        {slots.length < 4 && (
          <button
            onClick={addSlot}
            className="min-w-16 border border-dashed border-navy-600 rounded-lg text-slate-500 hover:text-white hover:border-slate-500 text-2xl transition-colors"
          >
            +
          </button>
        )}
      </div>

      {loadedSlots.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          Load at least one pitcher to see comparisons
        </div>
      )}

      {loadedSlots.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* View tabs + overlay toggle */}
          <div className="flex items-center gap-4 px-4 pt-3 border-b border-navy-700 shrink-0">
            <div className="flex gap-0">
              {([['movement', 'Movement'], ['velo', 'Velocity'], ['arsenal', 'Arsenal']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setActiveView(v)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeView === v ? 'border-blue-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
            {activeView === 'movement' && (
              <div className="ml-auto flex rounded overflow-hidden border border-navy-600 text-xs">
                {([['pitcher', 'By Pitcher'], ['type', 'By Pitch Type']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setOverlayMode(v)}
                    className={`px-2 py-1 ${overlayMode === v ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 p-4 overflow-hidden">
            {activeView === 'movement' && (
              <div className="h-full">
                <h2 className="text-base font-semibold text-white mb-3">Movement Comparison (IHB × IVB)</h2>
                <div className="h-[calc(100%-2rem)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
                      <XAxis type="number" dataKey="x" domain={[-25, 25]} tickCount={11}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        label={{ value: 'IHB (in, pitcher POV)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
                      <YAxis type="number" dataKey="y" domain={[-25, 25]} tickCount={11}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        label={{ value: 'IVB (in)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
                        itemStyle={{ color: '#cbd5e1' }}
                      />
                      {overlayMode === 'pitcher'
                        ? loadedSlots.map((slot, si) => {
                          const pts = slot.pitches.filter(p => p.ihb !== null && p.ivb !== null)
                            .map(p => ({ x: p.ihb!, y: p.ivb! }))
                          return (
                            <Scatter
                              key={si}
                              name={`${slot.player!.name_last} (${slot.pitches.length})`}
                              data={pts}
                              fill={PITCHER_COLORS[si]}
                              fillOpacity={0.6}
                            />
                          )
                        })
                        : loadedSlots.flatMap((slot, si) => {
                          const types = [...new Set(slot.pitches.map(p => p.pitch_type))]
                          return types.map(t => {
                            const pts = slot.pitches.filter(p => p.pitch_type === t && p.ihb !== null && p.ivb !== null)
                              .map(p => ({ x: p.ihb!, y: p.ivb! }))
                            return (
                              <Scatter
                                key={`${si}-${t}`}
                                name={`${slot.player!.name_last.slice(0, 8)} ${t}`}
                                data={pts}
                                fill={pitchColor(t)}
                                fillOpacity={0.5 + si * 0.15}
                              />
                            )
                          })
                        })
                      }
                      <Legend formatter={v => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{v}</span>} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeView === 'velo' && (
              <div className="h-full">
                <h2 className="text-base font-semibold text-white mb-3">Mean Velocity by Pitch Type</h2>
                <div className="h-[calc(100%-2rem)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={veloData} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-30} textAnchor="end" />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }}
                        label={{ value: 'mph', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 4, fontSize: 12 }}
                        formatter={(v: number) => [v.toFixed(1) + ' mph', 'Avg Velo']}
                      />
                      <Bar dataKey="velo" fill="#3b82f6">
                        {veloData.map((d, i) => (
                          <Cell key={i} fill={PITCHER_COLORS[d.slotIdx]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeView === 'arsenal' && (
              <div className="h-full overflow-auto">
                <h2 className="text-base font-semibold text-white mb-4">Arsenal Comparison</h2>
                <div className="grid gap-6">
                  {loadedSlots.map((slot, si) => {
                    const types = [...new Set(slot.pitches.map(p => p.pitch_type))].sort()
                    return (
                      <div key={si}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PITCHER_COLORS[si] }} />
                          <span className="font-semibold text-white">
                            {slot.player?.name_first} {slot.player?.name_last}
                          </span>
                          <span className="text-xs text-slate-500">{slot.pitches.length.toLocaleString()} pitches</span>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                          {types.map(t => {
                            const group = slot.pitches.filter(p => p.pitch_type === t)
                            const w = calcWhiffPct(group)
                            return (
                              <div key={t} className="bg-navy-800 rounded p-2 border text-xs"
                                style={{ borderColor: pitchColor(t) + '55' }}>
                                <div className="font-mono font-bold mb-1" style={{ color: pitchColor(t) }}>{t}</div>
                                <div className="text-slate-500 text-[10px] mb-1">{pitchName(t)}</div>
                                <div className="space-y-0.5 text-slate-300">
                                  <div>{(group.length / slot.pitches.length * 100).toFixed(1)}%</div>
                                  <div>{avg(group.map(p => p.release_speed))?.toFixed(1) ?? '—'} mph</div>
                                  <div>Whiff: {w !== null ? (w * 100).toFixed(1) + '%' : '—'}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
