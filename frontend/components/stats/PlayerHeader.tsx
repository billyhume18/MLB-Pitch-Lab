'use client'

interface Props { info: Record<string, unknown> | null }

function field(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (obj[k] !== null && obj[k] !== undefined && obj[k] !== '') return String(obj[k])
  }
  return '—'
}

export default function PlayerHeader({ info }: Props) {
  if (!info) return null

  const name = field(info, 'full_name', 'fullName')
  const team = field(info, 'current_team_name', 'currentTeamName')
  const pos  = field(info, 'primary_position_name', 'primaryPositionName')
  const age  = field(info, 'current_age', 'currentAge')
  const num  = field(info, 'primary_number', 'primaryNumber')
  const hand = field(info, 'pitch_hand_code', 'pitchHandCode')
  const ht   = field(info, 'height')
  const wt   = field(info, 'weight')
  const deb  = field(info, 'mlb_debut_date', 'mlbDebutDate')

  return (
    <div className="flex items-start gap-6 p-4 bg-navy-800 rounded-lg border border-navy-700 mb-4">
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-white">{name}</h1>
          {num !== '—' && (
            <span className="text-slate-400 text-lg font-mono">#{num}</span>
          )}
        </div>
        <div className="text-slate-300 mt-1">{team} · {pos}</div>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-400">
          <span>Age {age}</span>
          <span>{ht} / {wt} lbs</span>
          <span>Throws {hand}</span>
          {deb !== '—' && <span>Debut {deb.slice(0, 10)}</span>}
        </div>
      </div>
    </div>
  )
}
