import type { StatcastPitch } from './types'
import { avg, calcWhiffPct, calcCSWPct, SWING_DESCRIPTIONS } from './filters'

export function stdDev(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null && n !== undefined && !Number.isNaN(n))
  if (valid.length < 2) return null
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length
  const variance = valid.reduce((s, v) => s + (v - mean) ** 2, 0) / (valid.length - 1)
  return Math.sqrt(variance)
}

// Statcast zone codes: 1-9 = the 3x3 in-zone grid, 11-14 = out-of-zone quadrants.
export function calcZonePct(pitches: StatcastPitch[]): number | null {
  const withZone = pitches.filter(p => p.zone !== null)
  if (withZone.length === 0) return null
  return withZone.filter(p => p.zone! >= 1 && p.zone! <= 9).length / withZone.length
}

export function calcChasePct(pitches: StatcastPitch[]): number | null {
  const outOfZone = pitches.filter(p => p.zone !== null && p.zone! > 9)
  if (outOfZone.length === 0) return null
  return outOfZone.filter(p => SWING_DESCRIPTIONS.has(p.description)).length / outOfZone.length
}

export function calcHardHitPct(pitches: StatcastPitch[]): number | null {
  const batted = pitches.filter(p => p.launch_speed !== null)
  if (batted.length === 0) return null
  return batted.filter(p => p.launch_speed! >= 95).length / batted.length
}

// launch_speed_angle === 6 is Statcast's own "Barrel" quality-of-contact code.
export function calcBarrelPct(pitches: StatcastPitch[]): number | null {
  const batted = pitches.filter(p => p.launch_speed !== null && p.launch_angle !== null)
  if (batted.length === 0) return null
  return batted.filter(p => p.launch_speed_angle === 6).length / batted.length
}

export function calcXwobaAllowed(pitches: StatcastPitch[]): number | null {
  return avg(pitches.map(p => p.estimated_woba_using_speedangle))
}

export function calcXbaAllowed(pitches: StatcastPitch[]): number | null {
  return avg(pitches.map(p => p.estimated_ba_using_speedangle))
}

export interface PitchMixEntry { type: string; count: number; pct: number }

export function calcPitchMix(pitches: StatcastPitch[]): PitchMixEntry[] {
  const total = pitches.length
  if (total === 0) return []
  const counts = new Map<string, number>()
  for (const p of pitches) {
    if (!p.pitch_type) continue
    counts.set(p.pitch_type, (counts.get(p.pitch_type) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count, pct: count / total }))
    .sort((a, b) => b.count - a.count)
}

export interface PitcherSummary {
  pitchCount: number
  whiffPct: number | null
  cswPct: number | null
  chasePct: number | null
  zonePct: number | null
  hardHitPct: number | null
  barrelPct: number | null
  avgVelo: number | null
  veloSd: number | null
  avgSpin: number | null
  spinSd: number | null
  xwoba: number | null
  xba: number | null
}

// Every per-pitcher-per-timeframe derived stat from the pitch-level pull,
// in one call — used by both the Lab arsenal view and the Roster averages table.
export function calcPitcherSummary(pitches: StatcastPitch[]): PitcherSummary {
  return {
    pitchCount: pitches.length,
    whiffPct: calcWhiffPct(pitches),
    cswPct: calcCSWPct(pitches),
    chasePct: calcChasePct(pitches),
    zonePct: calcZonePct(pitches),
    hardHitPct: calcHardHitPct(pitches),
    barrelPct: calcBarrelPct(pitches),
    avgVelo: avg(pitches.map(p => p.release_speed)),
    veloSd: stdDev(pitches.map(p => p.release_speed)),
    avgSpin: avg(pitches.map(p => p.release_spin_rate)),
    spinSd: stdDev(pitches.map(p => p.release_spin_rate)),
    xwoba: calcXwobaAllowed(pitches),
    xba: calcXbaAllowed(pitches),
  }
}

// Innings-pitched strings from the MLB Stats API ("187.2") use ".1"/".2" to
// mean thirds of an inning, not tenths — convert to true decimal innings.
export function parseInningsPitched(ipStr: string | number | null | undefined): number | null {
  if (ipStr === null || ipStr === undefined || ipStr === '') return null
  const raw = parseFloat(String(ipStr))
  if (isNaN(raw)) return null
  return Math.trunc(raw) + (raw % 1) * 10 / 3
}

function apiNum(data: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!data) return null
  for (const k of keys) {
    const v = data[k]
    if (v !== null && v !== undefined && v !== '') {
      const n = Number(v)
      if (!isNaN(n)) return n
    }
  }
  return null
}

export function calcK9(data: Record<string, unknown> | null): number | null {
  const k = apiNum(data, 'strike_outs', 'strikeOuts')
  const ip = parseInningsPitched(apiNum(data, 'innings_pitched', 'inningsPitched'))
  return k !== null && ip ? (k / ip) * 9 : null
}

export function calcBB9(data: Record<string, unknown> | null): number | null {
  const bb = apiNum(data, 'base_on_balls', 'baseOnBalls')
  const ip = parseInningsPitched(apiNum(data, 'innings_pitched', 'inningsPitched'))
  return bb !== null && ip ? (bb / ip) * 9 : null
}

export function calcKPctFromApi(data: Record<string, unknown> | null): number | null {
  const k = apiNum(data, 'strike_outs', 'strikeOuts')
  const bf = apiNum(data, 'batters_faced', 'battersFaced')
  return k !== null && bf ? k / bf : null
}

export function calcBBPctFromApi(data: Record<string, unknown> | null): number | null {
  const bb = apiNum(data, 'base_on_balls', 'baseOnBalls')
  const bf = apiNum(data, 'batters_faced', 'battersFaced')
  return bb !== null && bf ? bb / bf : null
}

export interface ConsistencyEntry {
  type: string
  count: number
  veloAvg: number | null
  veloSd: number | null
  spinAvg: number | null
  spinSd: number | null
  relXSd: number | null
  relZSd: number | null
  relYSd: number | null
  extAvg: number | null
  extSd: number | null
}

// Std dev of velocity/spin/release point per pitch type — the mechanical
// consistency signal the workload/injury-prevention view cares about.
export function calcConsistencyByPitchType(pitches: StatcastPitch[]): ConsistencyEntry[] {
  const types = [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))]
  return types.map(type => {
    const g = pitches.filter(p => p.pitch_type === type)
    return {
      type,
      count: g.length,
      veloAvg: avg(g.map(p => p.release_speed)),
      veloSd: stdDev(g.map(p => p.release_speed)),
      spinAvg: avg(g.map(p => p.release_spin_rate)),
      spinSd: stdDev(g.map(p => p.release_spin_rate)),
      relXSd: stdDev(g.map(p => p.release_pos_x)),
      relZSd: stdDev(g.map(p => p.release_pos_z)),
      relYSd: stdDev(g.map(p => p.release_pos_y)),
      extAvg: avg(g.map(p => p.release_extension)),
      extSd: stdDev(g.map(p => p.release_extension)),
    }
  }).sort((a, b) => b.count - a.count)
}
