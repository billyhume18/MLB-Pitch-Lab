'use client'
import { useMemo, useState } from 'react'
import { pitchColor } from '@/lib/colors'
import { avg } from '@/lib/filters'
import ExportMenu from '@/components/table/ExportMenu'
import Plot from './Plot3D'
import type { StatcastPitch } from '@/lib/types'

interface Props { pitches: StatcastPitch[] }

interface FlightParams {
  release_pos_x: number; release_pos_y: number; release_pos_z: number
  vx0: number; vy0: number; vz0: number
  ax: number; ay: number; az: number
}

interface Point3 { x: number; y: number; z: number }

// Time to travel `distance` feet of displacement from release along the y
// axis, given the pitch's initial y-velocity/accel — same kinematic solve
// the backend uses for the single tunnel point (compute_tunnel_point in
// backend/api/pitches.R), generalized to any distance so a full curve (not
// just one point) can be sampled.
function timeAtDistance(vy0: number, ay: number, distance: number): number {
  const disc = Math.max(vy0 * vy0 - 2 * ay * distance, 0)
  return (-vy0 - Math.sqrt(disc)) / ay
}

function positionAt(p: FlightParams, t: number): Point3 {
  return {
    x: p.release_pos_x + p.vx0 * t + 0.5 * p.ax * t * t,
    y: p.release_pos_y - (p.vy0 * t + 0.5 * p.ay * t * t),
    z: p.release_pos_z + p.vz0 * t + 0.5 * p.az * t * t,
  }
}

const TUNNEL_DISTANCE = 30 // ft traveled from release — matches the backend's existing tunnel_x/tunnel_z convention

function buildTrajectory(p: FlightParams, nPoints = 30) {
  const tPlate = timeAtDistance(p.vy0, p.ay, p.release_pos_y)
  const tTunnel = Math.min(timeAtDistance(p.vy0, p.ay, TUNNEL_DISTANCE), tPlate)
  const curve: Point3[] = []
  for (let i = 0; i <= nPoints; i++) {
    curve.push(positionAt(p, (tPlate * i) / nPoints))
  }
  return {
    curve,
    release: positionAt(p, 0),
    tunnel: positionAt(p, tTunnel),
    plate: positionAt(p, tPlate),
  }
}

function avgFlightParams(pitches: StatcastPitch[]): FlightParams | null {
  const keys: (keyof FlightParams)[] = ['release_pos_x', 'release_pos_y', 'release_pos_z', 'vx0', 'vy0', 'vz0', 'ax', 'ay', 'az']
  const out: Partial<FlightParams> = {}
  for (const k of keys) {
    const v = avg(pitches.map(p => p[k] as number | null))
    if (v === null) return null
    out[k] = v
  }
  return out as FlightParams
}

function dist2(a: Point3, b: Point3): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2)
}

export default function TunnelingPlot({ pitches }: Props) {
  const [compareId, setCompareId] = useState<string>('')

  const byType = useMemo(() => {
    const types = [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort()
    return types.map(type => {
      const g = pitches.filter(p => p.pitch_type === type)
      const params = avgFlightParams(g)
      return {
        type,
        count: g.length,
        velo: avg(g.map(p => p.release_speed)),
        params,
        trajectory: params ? buildTrajectory(params) : null,
      }
    }).filter(t => t.trajectory !== null)
  }, [pitches])

  // Games with a manageable list of individually selectable pitches, for the
  // "how does this one pitch differ from its type's average" overlay.
  const gameOptions = useMemo(() => {
    const byGame = new Map<number, { date: string; pitches: StatcastPitch[] }>()
    for (const p of pitches) {
      if (p.vx0 === null || p.vy0 === null || p.vz0 === null || p.ax === null || p.ay === null || p.az === null) continue
      if (p.release_pos_x === null || p.release_pos_y === null || p.release_pos_z === null) continue
      if (!byGame.has(p.game_pk)) byGame.set(p.game_pk, { date: p.game_date, pitches: [] })
      byGame.get(p.game_pk)!.pitches.push(p)
    }
    return [...byGame.entries()]
      .map(([game_pk, v]) => ({
        game_pk,
        date: v.date,
        pitches: v.pitches.sort((a, b) => a.at_bat_number - b.at_bat_number || a.pitch_number - b.pitch_number),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [pitches])

  const comparePitch = useMemo(() => {
    if (!compareId) return null
    for (const g of gameOptions) {
      const found = g.pitches.find(p => `${p.game_pk}-${p.at_bat_number}-${p.pitch_number}` === compareId)
      if (found) return found
    }
    return null
  }, [compareId, gameOptions])

  const compareTrajectory = useMemo(() => {
    if (!comparePitch) return null
    const params: FlightParams = {
      release_pos_x: comparePitch.release_pos_x!, release_pos_y: comparePitch.release_pos_y!, release_pos_z: comparePitch.release_pos_z!,
      vx0: comparePitch.vx0!, vy0: comparePitch.vy0!, vz0: comparePitch.vz0!,
      ax: comparePitch.ax!, ay: comparePitch.ay!, az: comparePitch.az!,
    }
    return buildTrajectory(params)
  }, [comparePitch])

  const separations = useMemo(() => {
    const rows: Array<{ a: string; b: string; release_sep: number; tunnel_sep: number; plate_sep: number }> = []
    for (let i = 0; i < byType.length; i++) {
      for (let j = i + 1; j < byType.length; j++) {
        const a = byType[i], b = byType[j]
        if (!a.trajectory || !b.trajectory) continue
        rows.push({
          a: a.type, b: b.type,
          release_sep: dist2(a.trajectory.release, b.trajectory.release),
          tunnel_sep: dist2(a.trajectory.tunnel, b.trajectory.tunnel),
          plate_sep: dist2(a.trajectory.plate, b.trajectory.plate),
        })
      }
    }
    return rows.sort((r1, r2) => r1.tunnel_sep - r2.tunnel_sep)
  }, [byType])

  const paramRows = byType.map(t => ({
    pitch_type: t.type,
    count: t.count,
    avg_velo: t.velo,
    release_x: t.params?.release_pos_x, release_y: t.params?.release_pos_y, release_z: t.params?.release_pos_z,
    vx0: t.params?.vx0, vy0: t.params?.vy0, vz0: t.params?.vz0,
    ax: t.params?.ax, ay: t.params?.ay, az: t.params?.az,
    tunnel_x: t.trajectory?.tunnel.x, tunnel_z: t.trajectory?.tunnel.z,
    plate_x: t.trajectory?.plate.x, plate_z: t.trajectory?.plate.z,
  }))

  if (pitches.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Load data to see Tunneling</div>
  }
  if (byType.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Not enough physics data (release position / initial velocity / acceleration) to reconstruct flight paths.</div>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traces: any[] = []
  for (const t of byType) {
    if (!t.trajectory) continue
    const color = pitchColor(t.type)
    traces.push({
      type: 'scatter3d', mode: 'lines',
      name: `${t.type} avg (n=${t.count})`,
      x: t.trajectory.curve.map(p => p.x), y: t.trajectory.curve.map(p => p.y), z: t.trajectory.curve.map(p => p.z),
      line: { color, width: 6 },
      hovertemplate: `${t.type} avg<br>x=%{x:.2f} y=%{y:.2f} z=%{z:.2f}<extra></extra>`,
    })
    traces.push({
      type: 'scatter3d', mode: 'markers',
      name: `${t.type} tunnel/plate`,
      showlegend: false,
      x: [t.trajectory.release.x, t.trajectory.tunnel.x, t.trajectory.plate.x],
      y: [t.trajectory.release.y, t.trajectory.tunnel.y, t.trajectory.plate.y],
      z: [t.trajectory.release.z, t.trajectory.tunnel.z, t.trajectory.plate.z],
      marker: { color, size: 4, symbol: ['diamond', 'circle', 'square'] },
      text: ['Release', 'Decision pt (~30ft)', 'Plate'],
      hovertemplate: `${t.type} %{text}<br>x=%{x:.2f} y=%{y:.2f} z=%{z:.2f}<extra></extra>`,
    })
  }
  if (compareTrajectory && comparePitch) {
    traces.push({
      type: 'scatter3d', mode: 'lines',
      name: `Selected pitch (${comparePitch.pitch_type}, ${comparePitch.release_speed?.toFixed(1) ?? '—'}mph)`,
      x: compareTrajectory.curve.map(p => p.x), y: compareTrajectory.curve.map(p => p.y), z: compareTrajectory.curve.map(p => p.z),
      line: { color: '#ffffff', width: 4, dash: 'dot' },
      hovertemplate: 'Selected pitch<br>x=%{x:.2f} y=%{y:.2f} z=%{z:.2f}<extra></extra>',
    })
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-start justify-between shrink-0 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">Tunneling — Average Flight Path by Pitch Type</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Each line is the trajectory of the &quot;average&quot; pitch of that type (release point, velocity, and
            movement averaged, then one path computed) — not a raw scatter of individual pitches. Markers mark
            release, the ~30ft decision point, and the plate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={compareId}
            onChange={e => setCompareId(e.target.value)}
            className="bg-navy-800 border border-navy-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 max-w-[16rem]"
          >
            <option value="">Overlay an individual pitch…</option>
            {gameOptions.map(g => (
              <optgroup key={g.game_pk} label={g.date}>
                {g.pitches.map(p => (
                  <option key={`${p.game_pk}-${p.at_bat_number}-${p.pitch_number}`} value={`${p.game_pk}-${p.at_bat_number}-${p.pitch_number}`}>
                    AB{p.at_bat_number} P{p.pitch_number} · {p.pitch_type} · {p.release_speed?.toFixed(1) ?? '—'}mph
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-[3] min-h-0 bg-navy-950/40 rounded-lg border border-navy-700">
        <Plot
          data={traces}
          layout={{
            autosize: true,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#cbd5e1', size: 11 },
            margin: { l: 0, r: 0, t: 30, b: 0 },
            legend: { font: { color: '#cbd5e1', size: 10 }, orientation: 'h', x: 0, y: 0, yanchor: 'top' },
            scene: {
              bgcolor: 'rgba(0,0,0,0)',
              xaxis: { title: 'Horizontal (ft)', color: '#94a3b8', gridcolor: '#1e3a5f', zerolinecolor: '#475569' },
              yaxis: { title: 'Distance from plate (ft)', color: '#94a3b8', gridcolor: '#1e3a5f', zerolinecolor: '#475569' },
              zaxis: { title: 'Height (ft)', color: '#94a3b8', gridcolor: '#1e3a5f', zerolinecolor: '#475569' },
              camera: { eye: { x: 1.4, y: -1.9, z: 0.5 } },
            },
          }}
          config={{ displayModeBar: true, responsive: true }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="shrink-0 overflow-auto" style={{ maxHeight: '11rem' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Separation Between Pitch Types (ft)</div>
          <ExportMenu rows={separations} filenameBase="tunneling_separation" label="Export" />
        </div>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-navy-900">
            <tr className="border-b border-navy-700 text-slate-500">
              <th className="text-left pb-1.5 px-2">Pair</th>
              <th className="text-right pb-1.5 px-2">Release Sep</th>
              <th className="text-right pb-1.5 px-2">Decision-pt Sep</th>
              <th className="text-right pb-1.5 px-2">Plate Sep</th>
            </tr>
          </thead>
          <tbody>
            {separations.map(s => (
              <tr key={`${s.a}-${s.b}`} className="border-b border-navy-800">
                <td className="py-1 px-2">
                  <span style={{ color: pitchColor(s.a) }}>{s.a}</span>
                  <span className="text-slate-500"> / </span>
                  <span style={{ color: pitchColor(s.b) }}>{s.b}</span>
                </td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.release_sep.toFixed(3)}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.tunnel_sep.toFixed(3)}</td>
                <td className="py-1 px-2 text-right font-mono text-slate-300">{s.plate_sep.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between mt-3 mb-1">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Average Flight Parameters by Pitch Type</div>
          <ExportMenu rows={paramRows} filenameBase="tunneling_avg_flight_params" label="Export" />
        </div>
      </div>
    </div>
  )
}
