'use client'

interface Props {
  startDate: string
  endDate: string
  onStartChange: (d: string) => void
  onEndChange: (d: string) => void
}

const CURRENT_YEAR = new Date().getFullYear()
const TODAY = new Date().toISOString().slice(0, 10)

// Season list from 2015 up to the current calendar year, newest first
const SEASONS = Array.from(
  { length: CURRENT_YEAR - 2014 },
  (_, i) => 2015 + i
).reverse()

export default function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }: Props) {
  const handleSeason = (yr: number) => {
    onStartChange(`${yr}-03-01`)
    // Past complete seasons end ~Nov 1; current season ends today
    onEndChange(yr < CURRENT_YEAR ? `${yr}-11-01` : TODAY)
  }

  // Determine which season year to show in the dropdown
  const startYear = parseInt(startDate.slice(0, 4), 10)
  const displayYear = SEASONS.includes(startYear) ? startYear : SEASONS[0]

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Season</label>
        <select
          value={displayYear}
          onChange={e => handleSeason(Number(e.target.value))}
          className="w-full bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {SEASONS.map(yr => (
            <option key={yr} value={yr}>
              {yr}{yr === CURRENT_YEAR ? ' (current)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => onStartChange(e.target.value)}
            className="w-full bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => onEndChange(e.target.value)}
            className="w-full bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
