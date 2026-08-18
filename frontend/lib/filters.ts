import type { StatcastPitch, PitchFilters } from './types'

export function applyFilters(
  pitches: StatcastPitch[],
  f: PitchFilters,
  pitcherTeam: string | null = null
): StatcastPitch[] {
  return pitches.filter(p => {
    if (f.pitchTypes.size > 0 && !f.pitchTypes.has(p.pitch_type)) return false
    if (f.paResult    && p.events      !== f.paResult)    return false
    if (f.pitchResult && p.description !== f.pitchResult) return false
    if (f.bbType      && p.bb_type     !== f.bbType)      return false
    if (f.stand       && p.stand       !== f.stand)       return false
    if (f.pThrows     && p.p_throws    !== f.pThrows)     return false
    if (f.outs !== null && p.outs_when_up !== f.outs)     return false
    if (f.gamePk !== null && p.game_pk  !== f.gamePk)     return false

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
  return parts.length ? parts.join(' · ') : 'All pitches'
}

const WHIFF_DESCRIPTIONS = new Set([
  'swinging_strike',
  'swinging_strike_blocked',
  'missed_bunt',
])

const SWING_DESCRIPTIONS = new Set([
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
