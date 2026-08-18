export const PITCH_COLORS: Record<string, string> = {
  FF: '#E84444',
  SI: '#E85D04',
  FT: '#E85D04',
  FC: '#9B5DE5',
  SL: '#F5A623',
  ST: '#8E44AD',
  SV: '#8B5CF6',
  CU: '#2ECC71',
  KC: '#27AE60',
  CS: '#16A085',
  CH: '#3498DB',
  FS: '#1ABC9C',
  KN: '#F39C12',
  EP: '#E67E22',
  FA: '#E84444',
}

export const PITCHER_COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B']

export function pitchColor(type: string): string {
  return PITCH_COLORS[type] ?? '#64748b'
}

export const PITCH_NAMES: Record<string, string> = {
  FF: '4-Seam Fastball',
  SI: 'Sinker',
  FT: '2-Seam Fastball',
  FC: 'Cutter',
  SL: 'Slider',
  ST: 'Sweeper',
  SV: 'Slurve',
  CU: 'Curveball',
  KC: 'Knuckle Curve',
  CS: 'Slow Curve',
  CH: 'Changeup',
  FS: 'Splitter',
  KN: 'Knuckleball',
  EP: 'Eephus',
  FA: 'Fastball',
}

export function pitchName(type: string): string {
  return PITCH_NAMES[type] ?? type
}
