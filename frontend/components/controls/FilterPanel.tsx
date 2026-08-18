'use client'
import { pitchColor } from '@/lib/colors'
import { downloadFilteredCSV } from '@/lib/api'
import type { PitchFilters, StatcastPitch } from '@/lib/types'

interface Props {
  availablePitchTypes: string[]
  filters: PitchFilters
  onChange: (f: PitchFilters) => void
  onClear: () => void
  gameLog: Record<string, unknown>[]
  filteredPitches: StatcastPitch[]
  playerLastName: string
  startDate: string
  endDate: string
}

function Sect({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">{label}</div>
      {children}
    </section>
  )
}

function BtnSet({
  options,
  value,
  onChange,
}: {
  options: { v: string | number | null; label: string }[]
  value: string | number | null
  onChange: (v: string | number | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(({ v, label }) => (
        <button
          key={String(v ?? 'null')}
          onClick={() => onChange(v)}
          className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
            value === v
              ? 'bg-blue-600 text-white'
              : 'bg-navy-800 text-slate-400 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Sel({
  value,
  onChange,
  options,
}: {
  value: string | number
  onChange: (v: string) => void
  options: { v: string; label: string }[]
}) {
  return (
    <select
      value={String(value)}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-navy-800 border border-navy-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
    >
      {options.map(({ v, label }) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  )
}

const PA_RESULT_OPTIONS = [
  { v: '',                label: 'All' },
  { v: 'single',          label: 'Single' },
  { v: 'double',          label: 'Double' },
  { v: 'triple',          label: 'Triple' },
  { v: 'home_run',        label: 'Home Run' },
  { v: 'walk',            label: 'Walk' },
  { v: 'hit_by_pitch',    label: 'HBP' },
  { v: 'strikeout',       label: 'Strikeout' },
  { v: 'field_out',       label: 'Field Out' },
  { v: 'sac_fly',         label: 'Sac Fly' },
  { v: 'sac_bunt',        label: 'Sac Bunt' },
  { v: 'fielders_choice', label: "Fielder's Choice" },
  { v: 'double_play',     label: 'Double Play' },
  { v: 'field_error',     label: 'Error' },
]

const PITCH_RESULT_OPTIONS = [
  { v: '',                        label: 'All' },
  { v: 'ball',                    label: 'Ball' },
  { v: 'called_strike',           label: 'Called Strike' },
  { v: 'swinging_strike',         label: 'Swinging Strike' },
  { v: 'swinging_strike_blocked', label: 'Swinging Strike (Blocked)' },
  { v: 'foul',                    label: 'Foul' },
  { v: 'foul_tip',                label: 'Foul Tip' },
  { v: 'foul_bunt',               label: 'Foul Bunt' },
  { v: 'hit_into_play',           label: 'In Play (Out)' },
  { v: 'hit_into_play_no_out',    label: 'In Play (No Out)' },
  { v: 'hit_into_play_score',     label: 'In Play (Run Scored)' },
  { v: 'hit_by_pitch',            label: 'Hit By Pitch' },
  { v: 'pitchout',                label: 'Pitchout' },
]

const COUNT_OPTIONS = [
  { v: '',        label: 'All' },
  { v: '0-0',     label: '0-0' },
  { v: '0-1',     label: '0-1' },
  { v: '0-2',     label: '0-2' },
  { v: '1-0',     label: '1-0' },
  { v: '1-1',     label: '1-1' },
  { v: '1-2',     label: '1-2' },
  { v: '2-0',     label: '2-0' },
  { v: '2-1',     label: '2-1' },
  { v: '2-2',     label: '2-2' },
  { v: '3-0',     label: '3-0' },
  { v: '3-1',     label: '3-1' },
  { v: '3-2',     label: '3-2' },
  { v: 'ahead',   label: 'Pitcher Ahead' },
  { v: 'behind',  label: 'Pitcher Behind' },
  { v: 'even',    label: 'Even' },
  { v: '2strike', label: 'Two-Strike' },
  { v: 'full',    label: 'Full Count' },
]

const RUNNERS_ON_OPTIONS = [
  { v: '',         label: 'All' },
  { v: 'empty',    label: 'Empty' },
  { v: '1b',       label: '1B Only' },
  { v: '2b',       label: '2B Only' },
  { v: '3b',       label: '3B Only' },
  { v: '1b2b',     label: '1B + 2B' },
  { v: '1b3b',     label: '1B + 3B' },
  { v: '2b3b',     label: '2B + 3B' },
  { v: 'loaded',   label: 'Loaded' },
  { v: 'scoring',  label: 'Scoring Position' },
]

const ZONE_OPTIONS = [
  { v: 'null', label: 'All' },
  { v: '-1',   label: 'Heart (5,6,9,10)' },
  { v: '-2',   label: 'Shadow (edges)' },
  { v: '-3',   label: 'Chase (13,14)' },
  ...Array.from({ length: 14 }, (_, i) => ({ v: String(i + 1), label: `Zone ${i + 1}` })),
]

const QOC_OPTIONS = [
  { v: 'null', label: 'All' },
  { v: '6',    label: 'Barrel (6)' },
  { v: '5',    label: 'Solid Contact (5)' },
  { v: '4',    label: 'Flare or Burner (4)' },
  { v: '2',    label: 'Poorly Topped (2)' },
  { v: '3',    label: 'Poorly Under (3)' },
  { v: '1',    label: 'Poorly Weak (1)' },
]

const IF_ALIGN_OPTIONS = [
  { v: '',           label: 'All' },
  { v: 'Standard',   label: 'Standard' },
  { v: 'Shift',      label: 'Shift' },
  { v: 'Strategic',  label: 'Strategic' },
]

const OF_ALIGN_OPTIONS = [
  { v: '',                label: 'All' },
  { v: 'Standard',        label: 'Standard' },
  { v: '4th Outfielder',  label: '4th Outfielder' },
  { v: 'Strategic',       label: 'Strategic' },
]

function getLogVal(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return String(row[k])
  }
  return ''
}

export default function FilterPanel({
  availablePitchTypes, filters, onChange, onClear,
  gameLog, filteredPitches, playerLastName, startDate, endDate,
}: Props) {
  const set = (patch: Partial<PitchFilters>) => onChange({ ...filters, ...patch })

  const togglePitchType = (type: string) => {
    const next = new Set(filters.pitchTypes)
    next.has(type) ? next.delete(type) : next.add(type)
    set({ pitchTypes: next })
  }

  const toggleInning = (inn: string) => {
    if (inn === 'all') { set({ innings: new Set() }); return }
    const next = new Set(filters.innings)
    next.has(inn) ? next.delete(inn) : next.add(inn)
    set({ innings: next })
  }

  const inningActive = (inn: string) =>
    inn === 'all' ? filters.innings.size === 0 : filters.innings.has(inn)

  const INNINGS = ['1','2','3','4','5','6','7','8','9','extra']

  const gameOptions = [
    { v: 'null', label: 'All games' },
    ...gameLog.map(row => {
      const pk   = getLogVal(row, 'game_pk', 'gamePk', 'game_id')
      const date = getLogVal(row, 'game_date', 'date', 'gameDate').slice(0, 10)
      const opp  = getLogVal(row, 'opponent', 'opponent_team_abbreviation', 'opposingTeam')
      return { v: pk, label: `${date}${opp ? ' vs ' + opp : ''}` }
    }).filter(o => o.v),
  ]

  return (
    <div className="space-y-3 text-sm">

      {availablePitchTypes.length > 0 && (
        <Sect label="Pitch Type">
          <div className="flex flex-wrap gap-1">
            {availablePitchTypes.map(type => {
              const active = filters.pitchTypes.size === 0 || filters.pitchTypes.has(type)
              return (
                <button
                  key={type}
                  onClick={() => togglePitchType(type)}
                  className="px-1.5 py-0.5 rounded text-xs font-mono font-semibold border transition-opacity"
                  style={{
                    borderColor: pitchColor(type),
                    color: active ? '#fff' : pitchColor(type),
                    backgroundColor: active ? pitchColor(type) + '44' : 'transparent',
                    opacity: active ? 1 : 0.5,
                  }}
                >
                  {type}
                </button>
              )
            })}
          </div>
        </Sect>
      )}

      <Sect label="PA Result">
        <Sel value={filters.paResult} onChange={v => set({ paResult: v })} options={PA_RESULT_OPTIONS} />
      </Sect>

      <Sect label="Pitch Result">
        <Sel value={filters.pitchResult} onChange={v => set({ pitchResult: v })} options={PITCH_RESULT_OPTIONS} />
      </Sect>

      <Sect label="Batted Ball Type">
        <BtnSet
          value={filters.bbType}
          onChange={v => set({ bbType: String(v ?? '') })}
          options={[
            { v: '',            label: 'All' },
            { v: 'ground_ball', label: 'GB' },
            { v: 'line_drive',  label: 'LD' },
            { v: 'fly_ball',    label: 'FB' },
            { v: 'popup',       label: 'PU' },
          ]}
        />
      </Sect>

      <Sect label="Count">
        <Sel value={filters.count} onChange={v => set({ count: v })} options={COUNT_OPTIONS} />
      </Sect>

      <Sect label="Batter Hand">
        <BtnSet
          value={filters.stand}
          onChange={v => set({ stand: (v ?? '') as 'L' | 'R' | '' })}
          options={[{ v: '', label: 'All' }, { v: 'L', label: 'L' }, { v: 'R', label: 'R' }]}
        />
      </Sect>

      <Sect label="Pitcher Hand">
        <BtnSet
          value={filters.pThrows}
          onChange={v => set({ pThrows: (v ?? '') as 'L' | 'R' | '' })}
          options={[{ v: '', label: 'All' }, { v: 'L', label: 'L' }, { v: 'R', label: 'R' }]}
        />
      </Sect>

      <Sect label="Inning">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => toggleInning('all')}
            className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
              inningActive('all') ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          {INNINGS.map(inn => (
            <button
              key={inn}
              onClick={() => toggleInning(inn)}
              className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                inningActive(inn) && filters.innings.size > 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-navy-800 text-slate-400 hover:text-white'
              }`}
            >
              {inn === 'extra' ? '+' : inn}
            </button>
          ))}
        </div>
      </Sect>

      <Sect label="Outs">
        <BtnSet
          value={filters.outs}
          onChange={v => set({ outs: v === null ? null : Number(v) })}
          options={[
            { v: null, label: 'All' },
            { v: 0,    label: '0' },
            { v: 1,    label: '1' },
            { v: 2,    label: '2' },
          ]}
        />
      </Sect>

      <Sect label="Runners On Base">
        <Sel
          value={filters.runnersOn}
          onChange={v => set({ runnersOn: v })}
          options={RUNNERS_ON_OPTIONS}
        />
      </Sect>

      <Sect label="Gameday Zone">
        <Sel
          value={filters.zone === null ? 'null' : String(filters.zone)}
          onChange={v => set({ zone: v === 'null' ? null : Number(v) })}
          options={ZONE_OPTIONS}
        />
      </Sect>

      <Sect label="Season Type">
        <BtnSet
          value={filters.gameType}
          onChange={v => set({ gameType: String(v ?? 'all') })}
          options={[
            { v: 'all',        label: 'All' },
            { v: 'R',          label: 'Reg' },
            { v: 'S',          label: 'Spring' },
            { v: 'postseason', label: 'Post' },
          ]}
        />
      </Sect>

      <Sect label="Home / Away">
        <BtnSet
          value={filters.venue}
          onChange={v => set({ venue: (v ?? '') as 'home' | 'away' | '' })}
          options={[
            { v: '',      label: 'All' },
            { v: 'home',  label: 'Home' },
            { v: 'away',  label: 'Away' },
          ]}
        />
      </Sect>

      <Sect label="Quality of Contact">
        <Sel
          value={filters.qualityOfContact === null ? 'null' : String(filters.qualityOfContact)}
          onChange={v => set({ qualityOfContact: v === 'null' ? null : Number(v) })}
          options={QOC_OPTIONS}
        />
      </Sect>

      <Sect label="Batted Ball Direction">
        <BtnSet
          value={filters.bbDirection}
          onChange={v => set({ bbDirection: (v ?? '') as 'pull' | 'center' | 'oppo' | '' })}
          options={[
            { v: '',       label: 'All' },
            { v: 'pull',   label: 'Pull' },
            { v: 'center', label: 'Center' },
            { v: 'oppo',   label: 'Oppo' },
          ]}
        />
      </Sect>

      <Sect label="IF Alignment">
        <Sel value={filters.ifAlignment} onChange={v => set({ ifAlignment: v })} options={IF_ALIGN_OPTIONS} />
      </Sect>

      <Sect label="OF Alignment">
        <Sel value={filters.ofAlignment} onChange={v => set({ ofAlignment: v })} options={OF_ALIGN_OPTIONS} />
      </Sect>

      {gameOptions.length > 1 && (
        <Sect label="Single Game">
          <Sel
            value={filters.gamePk === null ? 'null' : String(filters.gamePk)}
            onChange={v => set({ gamePk: v === 'null' ? null : Number(v) })}
            options={gameOptions}
          />
        </Sect>
      )}

      <div className="pt-1 space-y-1.5">
        {filteredPitches.length > 0 && (
          <button
            onClick={() =>
              downloadFilteredCSV(
                filteredPitches,
                `statcast_${playerLastName || 'pitcher'}_${startDate}_${endDate}.csv`
              )
            }
            className="w-full py-1.5 rounded border border-slate-600 text-xs text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
          >
            Export CSV ({filteredPitches.length.toLocaleString()} pitches)
          </button>
        )}
        <button
          onClick={onClear}
          className="w-full py-1.5 rounded text-xs text-slate-400 border border-navy-600 hover:border-slate-500 hover:text-white transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  )
}
