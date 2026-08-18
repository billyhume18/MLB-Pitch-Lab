'use client'
import { useTimeFrame } from '@/lib/timeframe'

const CURRENT_YEAR = new Date().getFullYear()
const TODAY = new Date().toISOString().slice(0, 10)

// Season list from 2015 up to the current calendar year, newest first
const SEASONS = Array.from(
  { length: CURRENT_YEAR - 2014 },
  (_, i) => 2015 + i
).reverse()

export default function DateRangePicker() {
  const { startDate, endDate, setStartDate, setEndDate, setRange } = useTimeFrame()

  const handleSeason = (yr: number) => {
    // Past complete seasons end ~Nov 1; current season ends today
    setRange(`${yr}-03-01`, yr < CURRENT_YEAR ? `${yr}-11-01` : TODAY)
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
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
