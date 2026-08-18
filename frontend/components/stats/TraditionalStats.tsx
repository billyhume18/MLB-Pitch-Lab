'use client'
import InfoDot from '@/components/ui/InfoDot'

interface Props {
  season: Record<string, unknown> | null
  career: Record<string, unknown> | null
  seasonSaber?: Record<string, unknown> | null
}

function get(obj: Record<string, unknown> | null, ...keys: string[]): string {
  if (!obj) return '—'
  for (const k of keys) {
    const v = obj[k]
    if (v !== null && v !== undefined && v !== '') {
      const n = Number(v)
      if (!isNaN(n)) {
        if (Number.isInteger(n) || n > 10) return String(Math.round(n * 10) / 10)
        return n.toFixed(2)
      }
      return String(v)
    }
  }
  return '—'
}

// Convert "34.2" (34 2/3 innings) to decimal innings
function parseIP(ipStr: string): number | null {
  if (ipStr === '—') return null
  const raw = parseFloat(ipStr)
  if (isNaN(raw)) return null
  return Math.trunc(raw) + (raw % 1) * 10 / 3
}

// Approximation used only when no real FIP is available (e.g. career totals,
// which the MLB Stats API's sabermetrics endpoint does not aggregate across
// seasons). Season-level FIP should always prefer the real value from
// /api/stats/saber (see seasonSaber prop) instead of this constant-based calc.
function computeFIP(data: Record<string, unknown> | null): string {
  if (!data) return '—'
  const ipStr = get(data, 'innings_pitched', 'inningsPitched')
  const hrStr = get(data, 'home_runs', 'homeRuns')
  const bbStr = get(data, 'base_on_balls', 'baseOnBalls')
  const kStr  = get(data, 'strike_outs', 'strikeOuts')
  if (ipStr === '—' || hrStr === '—' || bbStr === '—' || kStr === '—') return '—'
  const ip = parseIP(ipStr)
  if (!ip) return '—'
  return ((13 * Number(hrStr) + 3 * Number(bbStr) - 2 * Number(kStr)) / ip + 3.10).toFixed(2)
}

function computeKPct(data: Record<string, unknown> | null): string {
  if (!data) return '—'
  const kStr  = get(data, 'strike_outs', 'strikeOuts')
  const bfStr = get(data, 'batters_faced', 'battersFaced')
  if (kStr === '—' || bfStr === '—' || Number(bfStr) === 0) return '—'
  return ((Number(kStr) / Number(bfStr)) * 100).toFixed(1) + '%'
}

function computeBBPct(data: Record<string, unknown> | null): string {
  if (!data) return '—'
  const bbStr = get(data, 'base_on_balls', 'baseOnBalls')
  const bfStr = get(data, 'batters_faced', 'battersFaced')
  if (bbStr === '—' || bfStr === '—' || Number(bfStr) === 0) return '—'
  return ((Number(bbStr) / Number(bfStr)) * 100).toFixed(1) + '%'
}

function computeK9(data: Record<string, unknown> | null): string {
  if (!data) return '—'
  const kStr  = get(data, 'strike_outs', 'strikeOuts')
  const ipStr = get(data, 'innings_pitched', 'inningsPitched')
  if (kStr === '—' || ipStr === '—') return '—'
  const ip = parseIP(ipStr)
  if (!ip) return '—'
  return ((Number(kStr) / ip) * 9).toFixed(1)
}

function computeBB9(data: Record<string, unknown> | null): string {
  if (!data) return '—'
  const bbStr = get(data, 'base_on_balls', 'baseOnBalls')
  const ipStr = get(data, 'innings_pitched', 'inningsPitched')
  if (bbStr === '—' || ipStr === '—') return '—'
  const ip = parseIP(ipStr)
  if (!ip) return '—'
  return ((Number(bbStr) / ip) * 9).toFixed(1)
}

function StatCell({ label, value, glossary }: { label: string; value: string; glossary?: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-bold text-white font-mono">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-center">
        {label}
        {glossary && <InfoDot term={glossary} />}
      </div>
    </div>
  )
}

function StatRow({
  data, label, saber,
}: {
  data: Record<string, unknown> | null
  label: string
  saber?: Record<string, unknown> | null
}) {
  if (!data) return null
  const wins   = get(data, 'wins', 'stat_wins')
  const losses = get(data, 'losses', 'stat_losses')
  const kbb    = get(data, 'strikeout_walk_ratio', 'strikeoutWalkRatio')
  const fip    = saber ? get(saber, 'fip') : '—'
  const xfip   = saber ? get(saber, 'xfip') : '—'
  const war    = saber ? get(saber, 'war') : '—'
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="grid grid-cols-6 md:grid-cols-8 gap-4 bg-navy-800 rounded-lg p-3 border border-navy-700">
        <StatCell label="W-L"   value={wins !== '—' && losses !== '—' ? `${wins}-${losses}` : '—'} />
        <StatCell label="ERA"   value={get(data, 'era', 'stat_era')} />
        <StatCell label="IP"    value={get(data, 'innings_pitched', 'inningsPitched')} />
        <StatCell label="K"     value={get(data, 'strike_outs', 'strikeOuts')} />
        <StatCell label="BB"    value={get(data, 'base_on_balls', 'baseOnBalls')} />
        <StatCell label="WHIP"  value={get(data, 'whip', 'stat_whip')} />
        <StatCell label="H"     value={get(data, 'hits', 'stat_hits')} />
        <StatCell label="HR"    value={get(data, 'home_runs', 'homeRuns')} />
        <StatCell label="SV"    value={get(data, 'saves', 'stat_saves')} />
        <StatCell label="BAA"   value={get(data, 'avg', 'batting_avg', 'obp')} />
        <StatCell label="K/9"   glossary="K/9"  value={computeK9(data)} />
        <StatCell label="BB/9"  glossary="BB/9" value={computeBB9(data)} />
        <StatCell label="K/BB"  value={kbb} />
        <StatCell label="K%"    glossary="K%"   value={computeKPct(data)} />
        <StatCell label="BB%"   glossary="BB%"  value={computeBBPct(data)} />
        <StatCell label="FIP"   glossary="FIP"  value={fip !== '—' ? fip : computeFIP(data)} />
        <StatCell label="xFIP"  glossary="xFIP" value={xfip} />
        <StatCell label="WAR"   glossary="WAR"  value={war} />
      </div>
    </div>
  )
}

export default function TraditionalStats({ season, career, seasonSaber }: Props) {
  if (!season && !career) return null
  return (
    <div className="space-y-4 mb-4">
      <StatRow data={season} label="This Season" saber={seasonSaber} />
      <StatRow data={career} label="Career" />
    </div>
  )
}
