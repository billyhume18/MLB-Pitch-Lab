'use client'
import PlayerSearch from '@/components/controls/PlayerSearch'
import DateRangePicker from '@/components/controls/DateRangePicker'
import FilterPanel from '@/components/controls/FilterPanel'
import Spinner from '@/components/ui/Spinner'
import type { PitchFilters, PlayerSearchResult, StatcastPitch } from '@/lib/types'
import { DEFAULT_FILTERS } from '@/lib/types'
import { getActivePitchTypes } from '@/lib/filters'

interface Props {
  selected: PlayerSearchResult | null
  onPlayerSelect: (p: PlayerSearchResult) => void
  startDate: string
  endDate: string
  onStartDateChange: (d: string) => void
  onEndDateChange: (d: string) => void
  onLoad: () => void
  loading: boolean
  pitches: StatcastPitch[]
  filteredPitches: StatcastPitch[]
  filters: PitchFilters
  onFiltersChange: (f: PitchFilters) => void
  gameLog: Record<string, unknown>[]
}

export default function Sidebar({
  selected, onPlayerSelect,
  startDate, endDate, onStartDateChange, onEndDateChange,
  onLoad, loading,
  pitches, filteredPitches,
  filters, onFiltersChange,
  gameLog,
}: Props) {
  const availableTypes = getActivePitchTypes(pitches)

  return (
    <aside className="w-60 shrink-0 h-full overflow-y-auto bg-navy-900 border-r border-navy-600 flex flex-col">
      <div className="p-3 space-y-3">
        <section>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Pitcher</div>
          <PlayerSearch selected={selected} onSelect={onPlayerSelect} />
        </section>

        <section>
          <DateRangePicker
            startDate={startDate} endDate={endDate}
            onStartChange={onStartDateChange} onEndChange={onEndDateChange}
          />
        </section>

        <button
          onClick={onLoad}
          disabled={!selected || loading}
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner size="sm" /> Loading...</> : 'Load Pitches'}
        </button>

        {pitches.length > 0 && (
          <div className="border-t border-navy-700 pt-3">
            <FilterPanel
              availablePitchTypes={availableTypes}
              filters={filters}
              onChange={onFiltersChange}
              onClear={() => onFiltersChange({ ...DEFAULT_FILTERS })}
              gameLog={gameLog}
              filteredPitches={filteredPitches}
              playerLastName={selected?.name_last ?? ''}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
