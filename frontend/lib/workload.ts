import type { StatcastPitch } from './types'
import { avg } from './filters'

export interface OutingSummary {
  game_pk: number
  game_date: string
  pitchCount: number
  restDays: number | null
  avgVelo: number | null
  avgSpin: number | null
}

// One row per outing (game_pk), sorted chronologically. Pitch count and rest
// days both come straight off the raw Statcast pull (numberOfPitches-worth of
// rows per game_pk, and the pitcher_days_since_prev_game column) — no need to
// hit a separate endpoint.
export function summarizeOutings(pitches: StatcastPitch[]): OutingSummary[] {
  const byGame = new Map<number, StatcastPitch[]>()
  for (const p of pitches) {
    if (!byGame.has(p.game_pk)) byGame.set(p.game_pk, [])
    byGame.get(p.game_pk)!.push(p)
  }
  const outings: OutingSummary[] = [...byGame.entries()].map(([game_pk, rows]) => {
    const restRow = rows.find(r => r.pitcher_days_since_prev_game !== null && r.pitcher_days_since_prev_game !== undefined)
    return {
      game_pk,
      game_date: rows[0].game_date,
      pitchCount: rows.length,
      restDays: restRow?.pitcher_days_since_prev_game ?? null,
      avgVelo: avg(rows.map(r => r.release_speed)),
      avgSpin: avg(rows.map(r => r.release_spin_rate)),
    }
  })
  return outings.sort((a, b) => a.game_date.localeCompare(b.game_date))
}

export interface WorkloadPoint extends OutingSummary {
  cumulativeSeasonPitches: number
  rollingAvgPrev3: number | null
  spike: boolean
}

// Acute:chronic-style workload spike: current outing's pitch count vs. the
// rolling average of the prior 3 outings, flagged when it exceeds the
// threshold multiplier (default 30% over the rolling average).
export function calcWorkload(pitches: StatcastPitch[], spikeThreshold = 1.3): WorkloadPoint[] {
  const outings = summarizeOutings(pitches)
  let cumulative = 0
  return outings.map((o, i) => {
    cumulative += o.pitchCount
    const prev3 = outings.slice(Math.max(0, i - 3), i)
    const rollingAvgPrev3 = prev3.length > 0 ? avg(prev3.map(p => p.pitchCount)) : null
    const spike = rollingAvgPrev3 !== null && rollingAvgPrev3 > 0 && o.pitchCount > rollingAvgPrev3 * spikeThreshold
    return { ...o, cumulativeSeasonPitches: cumulative, rollingAvgPrev3, spike }
  })
}

export interface FatigueSummary {
  veloDeltaAvg: number | null   // late-outing avg velo minus early-outing avg velo (negative = decline)
  spinDeltaAvg: number | null
  outingsAnalyzed: number
}

// Within-outing fatigue: first-N vs last-N pitches of each outing (only
// outings with at least 2*windowSize pitches so the two windows don't
// overlap), averaged across all qualifying outings.
export function calcWithinOutingFatigue(pitches: StatcastPitch[], windowSize = 15): FatigueSummary {
  const byGame = new Map<number, StatcastPitch[]>()
  for (const p of pitches) {
    if (!byGame.has(p.game_pk)) byGame.set(p.game_pk, [])
    byGame.get(p.game_pk)!.push(p)
  }

  const veloDeltas: number[] = []
  const spinDeltas: number[] = []

  for (const rows of byGame.values()) {
    if (rows.length < windowSize * 2) continue
    const sorted = [...rows].sort((a, b) =>
      a.at_bat_number !== b.at_bat_number ? a.at_bat_number - b.at_bat_number : a.pitch_number - b.pitch_number
    )
    const early = sorted.slice(0, windowSize)
    const late  = sorted.slice(-windowSize)

    const earlyVelo = avg(early.map(p => p.release_speed))
    const lateVelo  = avg(late.map(p => p.release_speed))
    if (earlyVelo !== null && lateVelo !== null) veloDeltas.push(lateVelo - earlyVelo)

    const earlySpin = avg(early.map(p => p.release_spin_rate))
    const lateSpin  = avg(late.map(p => p.release_spin_rate))
    if (earlySpin !== null && lateSpin !== null) spinDeltas.push(lateSpin - earlySpin)
  }

  return {
    veloDeltaAvg: avg(veloDeltas),
    spinDeltaAvg: avg(spinDeltas),
    outingsAnalyzed: veloDeltas.length,
  }
}
