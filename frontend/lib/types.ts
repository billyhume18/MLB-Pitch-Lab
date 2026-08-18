export interface PlayerSearchResult {
  name_first: string
  name_last: string
  key_mlbam: number
}

export interface StatcastPitch {
  pitch_type: string
  pitch_name: string
  game_date: string
  game_pk: number
  at_bat_number: number
  pitch_number: number
  game_year: number
  game_type: string
  release_speed: number | null
  effective_speed: number | null
  release_spin_rate: number | null
  spin_axis: number | null
  pfx_x: number | null
  pfx_z: number | null
  ihb: number | null
  ivb: number | null
  release_pos_x: number | null
  release_pos_z: number | null
  release_pos_y: number | null
  release_extension: number | null
  plate_x: number | null
  plate_z: number | null
  zone: number | null
  sz_top: number | null
  sz_bot: number | null
  vx0: number | null
  vy0: number | null
  vz0: number | null
  ax: number | null
  ay: number | null
  az: number | null
  tunnel_x: number | null
  tunnel_z: number | null
  balls: number
  strikes: number
  outs_when_up: number
  inning: number
  inning_topbot: string
  on_1b: number | null
  on_2b: number | null
  on_3b: number | null
  stand: 'L' | 'R'
  p_throws: 'L' | 'R'
  home_team: string
  away_team: string
  bat_score: number | null
  fld_score: number | null
  post_bat_score: number | null
  post_fld_score: number | null
  batter: number
  pitcher: number
  player_name: string
  type: 'B' | 'S' | 'X'
  description: string
  events: string | null
  bb_type: string | null
  hit_location: number | null
  launch_speed: number | null
  launch_angle: number | null
  hit_distance_sc: number | null
  hc_x: number | null
  hc_y: number | null
  estimated_ba_using_speedangle: number | null
  estimated_woba_using_speedangle: number | null
  woba_value: number | null
  babip_value: number | null
  iso_value: number | null
  launch_speed_angle: number | null
  delta_run_exp: number | null
  delta_home_win_exp: number | null
  if_fielding_alignment: string | null
  of_fielding_alignment: string | null
  [key: string]: unknown
}

export interface PitchFilters {
  pitchTypes: Set<string>
  paResult: string
  pitchResult: string
  bbType: string
  count: string
  stand: 'L' | 'R' | ''
  pThrows: 'L' | 'R' | ''
  innings: Set<string>
  outs: number | null
  runnersOn: string
  zone: number | null
  gameType: string
  venue: 'home' | 'away' | ''
  qualityOfContact: number | null
  bbDirection: 'pull' | 'center' | 'oppo' | ''
  ifAlignment: string
  ofAlignment: string
  gamePk: number | null
}

export const DEFAULT_FILTERS: PitchFilters = {
  pitchTypes: new Set<string>(),
  paResult: '',
  pitchResult: '',
  bbType: '',
  count: '',
  stand: '',
  pThrows: '',
  innings: new Set<string>(),
  outs: null,
  runnersOn: '',
  zone: null,
  gameType: 'all',
  venue: '',
  qualityOfContact: null,
  bbDirection: '',
  ifAlignment: '',
  ofAlignment: '',
  gamePk: null,
}
