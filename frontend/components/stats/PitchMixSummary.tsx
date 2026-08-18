'use client'
import { useMemo } from 'react'
import { pitchColor, pitchName } from '@/lib/colors'
import { calcWhiffPct, calcCSWPct, avg } from '@/lib/filters'
import type { StatcastPitch } from '@/lib/types'

interface Props { pitches: StatcastPitch[] }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-mono">{value}</span>
    </div>
  )
}

export default function PitchMixSummary({ pitches }: Props) {
  const arsenal = useMemo(() => {
    const types = [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort()
    return types.map(type => {
      const g = pitches.filter(p => p.pitch_type === type)
      return {
        type,
        name:      pitchName(type),
        count:     g.length,
        pct:       g.length / pitches.length,
        velo:      avg(g.map(p => p.release_speed)),
        effVelo:   avg(g.map(p => p.effective_speed)),
        spin:      avg(g.map(p => p.release_spin_rate)),
        ivb:       avg(g.map(p => p.ivb)),
        ihb:       avg(g.map(p => p.ihb)),
        whiff:     calcWhiffPct(g),
        csw:       calcCSWPct(g),
        xba:       avg(g.map(p => p.estimated_ba_using_speedangle)),
        xwoba:     avg(g.map(p => p.estimated_woba_using_speedangle)),
      }
    }).sort((a, b) => b.count - a.count)
  }, [pitches])

  if (pitches.length === 0) return null

  return (
    <div className="mb-4">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Arsenal</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {arsenal.map(p => (
          <div
            key={p.type}
            className="rounded-lg p-3 border"
            style={{ borderColor: pitchColor(p.type) + '66', backgroundColor: pitchColor(p.type) + '11' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-sm" style={{ color: pitchColor(p.type) }}>{p.type}</span>
              <span className="text-xs text-slate-400 font-mono">{(p.pct * 100).toFixed(1)}%</span>
            </div>
            <div className="text-xs text-slate-500 mb-2 truncate">{p.name}</div>
            <div className="space-y-0.5 text-xs">
              <Row label="Velo"    value={p.velo?.toFixed(1) ?? '—'} />
              <Row label="Eff Velo" value={p.effVelo?.toFixed(1) ?? '—'} />
              <Row label="Spin"    value={p.spin?.toFixed(0) ?? '—'} />
              <Row label="IVB"     value={p.ivb  !== null ? p.ivb.toFixed(1) + '"' : '—'} />
              <Row label="IHB"     value={p.ihb  !== null ? p.ihb.toFixed(1) + '"' : '—'} />
              <Row label="Whiff%"  value={p.whiff !== null ? (p.whiff * 100).toFixed(1) + '%' : '—'} />
              <Row label="CSW%"    value={p.csw   !== null ? (p.csw   * 100).toFixed(1) + '%' : '—'} />
              <Row label="xBA"     value={p.xba   !== null ? p.xba.toFixed(3)               : '—'} />
              <Row label="xwOBA"   value={p.xwoba !== null ? p.xwoba.toFixed(3)             : '—'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
