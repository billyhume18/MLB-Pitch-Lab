import type { StatcastPitch, PitchFilters, NumRange } from './types'

function inRange(v: number | null | undefined, r: NumRange): boolean {
  if (r.min === null && r.max === null) return true
  if (v === null || v === undefined || Number.isNaN(v)) return false
  if (r.min !== null && v < r.min) return false
  if (r.max !== null && v > r.max) return false
  return true
}

// game_pk -> total raw pitch count, computed from the UNFILTERED pull so
// "min pitches per game" reflects the whole outing, not the filtered subset.
function countByGame(pitches: StatcastPitch[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const p of pitches) counts.set(p.game_pk, (counts.get(p.game_pk) ?? 0) + 1)
  return counts
}

export function applyFilters(
  pitches: StatcastPitch[],
  f: PitchFilters,
  pitcherTeam: string | null = null
): StatcastPitch[] {
  const gameCounts = f.minPitchesGame !== null ? countByGame(pitches) : null

  return pitches.filter(p => {
    if (gameCounts && (gameCounts.get(p.game_pk) ?? 0) < f.minPitchesGame!) return false

    if (f.pitchTypes.size > 0 && !f.pitchTypes.has(p.pitch_type)) return false
    if (f.paResult    && p.events      !== f.paResult)    return false
    if (f.pitchResult && p.description !== f.pitchResult) return false
    if (f.bbType      && p.bb_type     !== f.bbType)      return false
    if (f.stand       && p.stand       !== f.stand)       return false
    if (f.pThrows     && p.p_throws    !== f.pThrows)     return false
    if (f.outs !== null && p.outs_when_up !== f.outs)     return false
    if (f.gamePk !== null && p.game_pk  !== f.gamePk)     return false

    if (!inRange(p.release_speed,      f.veloRange))            return false
    if (!inRange(p.release_spin_rate,  f.spinRange))             return false
    if (!inRange(p.ihb,                f.ihbRange))              return false
    if (!inRange(p.ivb,                f.ivbRange))              return false
    if (!inRange(p.release_pos_x,      f.releasePosXRange))      return false
    if (!inRange(p.release_pos_z,      f.releasePosZRange))      return false
    if (!inRange(p.release_extension,  f.releaseExtensionRange)) return false
    if (!inRange(p.arm_angle,          f.armAngleRange))         return false
    if (!inRange(p.plate_x,            f.plateXRange))           return false
    if (!inRange(p.plate_z,            f.plateZRange))           return false
    if (!inRange(p.launch_speed,       f.launchSpeedRange))      return false
    if (!inRange(p.launch_angle,       f.launchAngleRange))      return false
    if (!inRange(p.pitcher_days_since_prev_game, f.daysRestRange)) return false

    if (f.barrelsOnly && p.launch_speed_angle !== 6) return false

    if (f.inningHalf) {
      const wantTop = f.inningHalf === 'top'
      if ((p.inning_topbot === 'Top') !== wantTop) return false
    }

    if (f.handednessMatchup) {
      const same = p.stand === p.p_throws
      if (f.handednessMatchup === 'same'     && !same) return false
      if (f.handednessMatchup === 'opposite' &&  same) return false
    }

    if (f.opponentTeam && pitcherTeam) {
      const oppTeam = p.home_team === pitcherTeam ? p.away_team : p.home_team
      if (oppTeam !== f.opponentTeam) return false
    }

    if (f.timesThroughOrder !== null) {
      const raw = p.n_thruorder_pitcher
      if (raw === null || raw === undefined) return false
      const bucket = raw >= 4 ? 4 : raw
      if (bucket !== f.timesThroughOrder) return false
    }

    if (f.gameType && f.gameType !== 'all') {
      const postseason = ['F', 'D', 'L', 'W']
      if (f.gameType === 'postseason' && !postseason.includes(p.game_type)) return false
      if (f.gameType === 'R'          && p.game_type !== 'R') return false
      if (f.gameType === 'S'          && p.game_type !== 'S') return false
    }

    if (f.count) {
      if      (f.count === 'ahead')   { if (!(p.strikes > p.balls))              return false }
      else if (f.count === 'behind')  { if (!(p.balls > p.strikes))              return false }
      else if (f.count === 'even')    { if (!(p.balls === p.strikes))            return false }
      else if (f.count === '2strike') { if (!(p.strikes === 2))                  return false }
      else if (f.count === 'full')    { if (!(p.balls === 3 && p.strikes === 2)) return false }
      else {
        const [b, s] = f.count.split('-').map(Number)
        if (p.balls !== b || p.strikes !== s) return false
      }
    }

    if (f.innings.size > 0) {
      const inn = p.inning >= 10 ? 'extra' : String(p.inning)
      if (!f.innings.has(inn)) return false
    }

    if (f.runnersOn) {
      const h1 = p.on_1b != null, h2 = p.on_2b != null, h3 = p.on_3b != null
      if (f.runnersOn === 'empty'   && (h1 || h2 || h3))    return false
      if (f.runnersOn === '1b'      && !(h1 && !h2 && !h3)) return false
      if (f.runnersOn === '2b'      && !(!h1 && h2 && !h3)) return false
      if (f.runnersOn === '3b'      && !(!h1 && !h2 && h3)) return false
      if (f.runnersOn === '1b2b'    && !(h1 && h2 && !h3))  return false
      if (f.runnersOn === '1b3b'    && !(h1 && !h2 && h3))  return false
      if (f.runnersOn === '2b3b'    && !(!h1 && h2 && h3))  return false
      if (f.runnersOn === 'loaded'  && !(h1 && h2 && h3))   return false
      if (f.runnersOn === 'scoring' && !(h2 || h3))         return false
    }

    if (f.zone !== null) {
      if (f.zone === -1) {
        if (![5, 6, 9, 10].includes(p.zone ?? -99)) return false
      } else if (f.zone === -2) {
        if (![1, 2, 3, 4, 7, 8, 11, 12].includes(p.zone ?? -99)) return false
      } else if (f.zone === -3) {
        if (![13, 14].includes(p.zone ?? -99)) return false
      } else {
        if (p.zone !== f.zone) return false
      }
    }

    if (f.qualityOfContact !== null && p.launch_speed_angle !== f.qualityOfContact) return false

    if (f.bbDirection) {
      if (p.hc_x == null) return false
      const pull   = p.stand === 'R' ? p.hc_x < 100 : p.hc_x > 150
      const oppo   = p.stand === 'R' ? p.hc_x > 150 : p.hc_x < 100
      const center = !pull && !oppo
      if (f.bbDirection === 'pull'   && !pull)   return false
      if (f.bbDirection === 'center' && !center) return false
      if (f.bbDirection === 'oppo'   && !oppo)   return false
    }

    if (f.ifAlignment && p.if_fielding_alignment !== f.ifAlignment) return false
    if (f.ofAlignment && p.of_fielding_alignment !== f.ofAlignment) return false

    if (f.venue && pitcherTeam) {
      if (f.venue === 'home' && p.home_team !== pitcherTeam) return false
      if (f.venue === 'away' && p.away_team !== pitcherTeam) return false
    }

    return true
  })
}

export function getActivePitchTypes(pitches: StatcastPitch[]): string[] {
  return [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort()
}

export function getOpponentTeams(pitches: StatcastPitch[], pitcherTeam: string | null): string[] {
  if (!pitcherTeam) return []
  const teams = new Set<string>()
  for (const p of pitches) {
    const opp = p.home_team === pitcherTeam ? p.away_team : p.home_team
    if (opp) teams.add(opp)
  }
  return [...teams].sort()
}

function describeRange(label: string, r: NumRange): string | null {
  if (r.min === null && r.max === null) return null
  if (r.min !== null && r.max !== null) return `${label} ${r.min}-${r.max}`
  if (r.min !== null) return `${label} ≥${r.min}`
  return `${label} ≤${r.max}`
}

export function describeFilters(_pitches: StatcastPitch[], f: PitchFilters): string {
  const parts: string[] = []
  if (f.pitchTypes.size > 0) parts.push([...f.pitchTypes].join(', '))
  if (f.stand)          parts.push(`vs ${f.stand}HB`)
  if (f.pThrows)        parts.push(`P ${f.pThrows}HB`)
  if (f.count)          parts.push(`Count: ${f.count}`)
  if (f.innings.size > 0) parts.push(`Inn: ${[...f.innings].join(',')}`)
  if (f.runnersOn)      parts.push(f.runnersOn)
  if (f.paResult)       parts.push(f.paResult)
  if (f.pitchResult)    parts.push(f.pitchResult)
  if (f.venue)          parts.push(f.venue)
  if (f.gameType !== 'all') parts.push(f.gameType === 'R' ? 'Regular' : f.gameType === 'S' ? 'Spring' : 'Postseason')
  if (f.gamePk)         parts.push(`Game ${f.gamePk}`)
  if (f.inningHalf)     parts.push(f.inningHalf === 'top' ? 'Top half' : 'Bottom half')
  if (f.handednessMatchup) parts.push(f.handednessMatchup === 'same' ? 'Same-side' : 'Opposite-side')
  if (f.opponentTeam)   parts.push(`vs ${f.opponentTeam}`)
  if (f.timesThroughOrder !== null) parts.push(`TTO ${f.timesThroughOrder}${f.timesThroughOrder === 4 ? '+' : ''}`)
  if (f.barrelsOnly)    parts.push('Barrels only')
  if (f.minPitchesGame !== null) parts.push(`≥${f.minPitchesGame} pitches/game`);
  [
    describeRange('Velo', f.veloRange),
    describeRange('Spin', f.spinRange),
    describeRange('IHB', f.ihbRange),
    describeRange('IVB', f.ivbRange),
    describeRange('Rel X', f.releasePosXRange),
    describeRange('Rel Z', f.releasePosZRange),
    describeRange('Ext', f.releaseExtensionRange),
    describeRange('Arm∠', f.armAngleRange),
    describeRange('Plate X', f.plateXRange),
    describeRange('Plate Z', f.plateZRange),
    describeRange('EV', f.launchSpeedRange),
    describeRange('LA', f.launchAngleRange),
    describeRange('Rest', f.daysRestRange),
  ].forEach(d => { if (d) parts.push(d) })
  return parts.length ? parts.join(' · ') : 'All pitches'
}

export const WHIFF_DESCRIPTIONS = new Set([
  'swinging_strike',
  'swinging_strike_blocked',
  'missed_bunt',
])

export const SWING_DESCRIPTIONS = new Set([
  'swinging_strike',
  'swinging_strike_blocked',
  'missed_bunt',
  'foul',
  'foul_bunt',
  'foul_tip',
  'hit_into_play',
  'hit_into_play_no_out',
  'hit_into_play_score',
])

export function calcWhiffPct(pitches: StatcastPitch[]): number | null {
  const swings = pitches.filter(p => SWING_DESCRIPTIONS.has(p.description)).length
  if (swings === 0) return null
  return pitches.filter(p => WHIFF_DESCRIPTIONS.has(p.description)).length / swings
}

export function calcCSWPct(pitches: StatcastPitch[]): number | null {
  if (pitches.length === 0) return null
  const csw = pitches.filter(p =>
    WHIFF_DESCRIPTIONS.has(p.description) || p.description === 'called_strike'
  ).length
  return csw / pitches.length
}

export function avg(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null && n !== undefined && !isNaN(n))
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}
