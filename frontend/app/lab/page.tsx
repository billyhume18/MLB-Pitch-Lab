'use client'
import { useState, useMemo, useCallback, useRef } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import PlayerHeader from '@/components/stats/PlayerHeader'
import TraditionalStats from '@/components/stats/TraditionalStats'
import PitchMixSummary from '@/components/stats/PitchMixSummary'
import SequencingMatrix from '@/components/viz/SequencingMatrix'
import SituationSplits from '@/components/viz/SituationSplits'
import MovementPlot from '@/components/viz/MovementPlot'
import ReleasePoint from '@/components/viz/ReleasePoint'
import VeloTrend from '@/components/viz/VeloTrend'
import TunnelingPlot from '@/components/viz/TunnelingPlot'
import StrikeZone from '@/components/viz/StrikeZone'
import WorkloadChart from '@/components/viz/WorkloadChart'
import BaselineCompare from '@/components/viz/BaselineCompare'
import PitchTable from '@/components/table/PitchTable'
import ExportMenu from '@/components/table/ExportMenu'
import Spinner from '@/components/ui/Spinner'
import { fetchPitches, getPlayerInfo, getSeasonStats, getCareerStats, getGameLog, getSaberStats } from '@/lib/api'
import { applyFilters, describeFilters, calcWhiffPct, avg } from '@/lib/filters'
import { calcWithinOutingFatigue } from '@/lib/workload'
import { DEFAULT_FILTERS } from '@/lib/types'
import { pitchColor } from '@/lib/colors'
import { useTimeFrame } from '@/lib/timeframe'
import type { StatcastPitch, PitchFilters, PlayerSearchResult } from '@/lib/types'

const TABS = [
  { id: 'arsenal',    label: 'Arsenal' },
  { id: 'sequencing', label: 'Sequencing' },
  { id: 'splits',     label: 'Situation Splits' },
  { id: 'movement',   label: 'Movement' },
  { id: 'release',    label: 'Release Point' },
  { id: 'velo',       label: 'Velo / Fatigue' },
  { id: 'tunnel',     label: 'Tunneling' },
  { id: 'heatmap',    label: 'Command' },
  { id: 'workload',   label: 'Workload' },
  { id: 'baseline',   label: 'Baseline' },
  { id: 'log',        label: 'Pitch Log' },
]

export default function LabPage() {
  const { startDate, endDate } = useTimeFrame()
  const [selected,    setSelected]    = useState<PlayerSearchResult | null>(null)
  const [pitches,     setPitches]     = useState<StatcastPitch[]>([])
  const [playerInfo,  setPlayerInfo]  = useState<Record<string, unknown> | null>(null)
  const [seasonStats, setSeasonStats] = useState<Record<string, unknown> | null>(null)
  const [careerStats, setCareerStats] = useState<Record<string, unknown> | null>(null)
  const [seasonSaber, setSeasonSaber] = useState<Record<string, unknown> | null>(null)
  const [priorSeasonStats, setPriorSeasonStats] = useState<Record<string, unknown> | null>(null)
  const [gameLog,     setGameLog]     = useState<Record<string, unknown>[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [activeTab,   setActiveTab]   = useState('arsenal')
  const [filters,     setFilters]     = useState<PitchFilters>({ ...DEFAULT_FILTERS })
  const [gameLogOpen, setGameLogOpen] = useState(false)
  const tabContentRef = useRef<HTMLDivElement>(null)

  // Determine pitcher's team abbreviation from Statcast data (used for Home/Away filter)
  const pitcherTeam = useMemo(() => {
    if (!pitches.length) return null
    const p = pitches[0]
    // Top of inning = home team is fielding (pitching)
    // Bot of inning = away team is fielding (pitching)
    return p.inning_topbot === 'Top' ? p.home_team : p.away_team
  }, [pitches])

  const filteredPitches = useMemo(
    () => applyFilters(pitches, filters, pitcherTeam),
    [pitches, filters, pitcherTeam]
  )

  const handleLoad = useCallback(async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    setPitches([])
    setPlayerInfo(null)
    setSeasonStats(null)
    setCareerStats(null)
    setSeasonSaber(null)
    setPriorSeasonStats(null)
    setGameLog([])
    setFilters({ ...DEFAULT_FILTERS })

    const yr = Number(startDate.slice(0, 4))

    try {
      const [pitchData, info, stats, career, log, saber, prior] = await Promise.all([
        fetchPitches(selected.key_mlbam, startDate, endDate),
        getPlayerInfo(selected.key_mlbam),
        getSeasonStats(selected.key_mlbam, yr),
        getCareerStats(selected.key_mlbam),
        getGameLog(selected.key_mlbam, yr),
        getSaberStats(selected.key_mlbam, yr),
        getSeasonStats(selected.key_mlbam, yr - 1).catch(() => null),
      ])
      setPitches(pitchData.pitches ?? [])
      setPlayerInfo(info)
      setSeasonStats(stats)
      setCareerStats(career)
      setSeasonSaber(saber)
      setPriorSeasonStats(prior)
      setGameLog(Array.isArray(log) ? log : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data. Is the R backend running on port 8000?')
    } finally {
      setLoading(false)
    }
  }, [selected, startDate, endDate])

  const handleGameSelect = (gamePk: number) => {
    setFilters(f => ({ ...f, gamePk }))
    setActiveTab('log')
  }

  const filterDesc = filteredPitches.length > 0
    ? `${filteredPitches.length.toLocaleString()} pitches · ${describeFilters(filteredPitches, filters)}`
    : null

  return (
    <div className="flex h-full min-h-0">
      <Sidebar
        selected={selected}
        onPlayerSelect={p => { setSelected(p); setFilters({ ...DEFAULT_FILTERS }) }}
        onLoad={handleLoad} loading={loading}
        pitches={pitches} filteredPitches={filteredPitches} pitcherTeam={pitcherTeam}
        filters={filters} onFiltersChange={setFilters}
        gameLog={gameLog}
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {error && (
          <div className="mx-4 mt-3 px-4 py-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Spinner size="lg" />
            <div className="text-center">
              <div className="text-base font-medium">Fetching Statcast data...</div>
              <div className="text-sm mt-1 text-slate-500">
                First load takes 30–90 s · Subsequent loads are cached
              </div>
            </div>
          </div>
        )}

        {!loading && pitches.length === 0 && !error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="text-4xl">⚾</div>
            <div className="text-lg font-medium text-slate-400">Search for a pitcher to get started</div>
            <div className="text-sm">Select a pitcher, set a date range, and click Load Pitches</div>
          </div>
        )}

        {!loading && pitches.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-0 px-4 pt-3 border-b border-navy-700 shrink-0 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                    activeTab === tab.id
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              {filterDesc && (
                <div className="ml-auto pl-4 text-xs text-slate-500 whitespace-nowrap pb-2">
                  {filterDesc}
                </div>
              )}
              <div className="pl-3 pb-2">
                <ExportMenu
                  rows={filteredPitches}
                  filenameBase={`statcast_${selected?.name_last ?? 'pitcher'}_${startDate}_${endDate}`}
                  pdfTitle={`${selected ? `${selected.name_first} ${selected.name_last}` : 'Pitcher'} — ${TABS.find(t => t.id === activeTab)?.label ?? ''}`}
                  pdfSubtitle={`${startDate} to ${endDate}`}
                  chartContainerRef={tabContentRef}
                />
              </div>
            </div>

            {/* Tab content */}
            <div ref={tabContentRef} className="flex-1 min-h-0 overflow-hidden p-4">
              {activeTab === 'arsenal' && (
                <div className="h-full overflow-auto">
                  <PlayerHeader info={playerInfo} />
                  <TraditionalStats season={seasonStats} career={careerStats} seasonSaber={seasonSaber} />
                  <PitchMixSummary pitches={filteredPitches} />
                  <HandednessSplits pitches={filteredPitches} />
                  {gameLog.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setGameLogOpen(v => !v)}
                        className="text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2 mb-2"
                      >
                        <span>{gameLogOpen ? '▼' : '▶'}</span>
                        Game Log ({gameLog.length} outings)
                      </button>
                      {gameLogOpen && (
                        <GameLogTable
                          log={gameLog}
                          selectedPk={filters.gamePk}
                          onSelect={handleGameSelect}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'sequencing' && <SequencingMatrix pitches={filteredPitches} />}
              {activeTab === 'splits'     && <SituationSplits  pitches={filteredPitches} />}
              {activeTab === 'movement'   && <MovementPlot pitches={filteredPitches} filters={filters} />}
              {activeTab === 'release'    && <ReleasePoint pitches={filteredPitches} />}
              {activeTab === 'velo'       && (
                <div className="h-full flex flex-col gap-3">
                  <FatigueSummary pitches={filteredPitches} />
                  <div className="flex-1 min-h-0">
                    <VeloTrend pitches={filteredPitches} gamePk={filters.gamePk} />
                  </div>
                </div>
              )}
              {activeTab === 'tunnel'     && <TunnelingPlot pitches={filteredPitches} />}
              {activeTab === 'heatmap'    && <StrikeZone pitches={filteredPitches} />}
              {activeTab === 'workload'   && <WorkloadChart pitches={pitches} />}
              {activeTab === 'baseline'   && (
                <BaselineCompare
                  current={seasonStats}
                  currentLabel={`${Number(startDate.slice(0, 4))} Season`}
                  career={careerStats}
                  priorSeason={priorSeasonStats}
                  priorSeasonLabel={`${Number(startDate.slice(0, 4)) - 1} Season`}
                  pitches={pitches}
                />
              )}
              {activeTab === 'log'        && (
                <PitchTable
                  pitches={filteredPitches}
                  lastName={selected?.name_last ?? ''}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FatigueSummary({ pitches }: { pitches: StatcastPitch[] }) {
  const f = useMemo(() => calcWithinOutingFatigue(pitches), [pitches])
  if (f.outingsAnalyzed === 0) return null
  return (
    <div className="shrink-0 bg-navy-800 rounded-lg p-3 border border-navy-700 flex gap-6 text-xs">
      <div className="text-slate-500">
        Within-outing fatigue (first 15 vs. last 15 pitches, {f.outingsAnalyzed} qualifying outing{f.outingsAnalyzed === 1 ? '' : 's'})
      </div>
      <span className="text-slate-400">
        Velo Δ <span className={`font-mono ${f.veloDeltaAvg !== null && f.veloDeltaAvg < 0 ? 'text-red-400' : 'text-white'}`}>
          {f.veloDeltaAvg !== null ? (f.veloDeltaAvg > 0 ? '+' : '') + f.veloDeltaAvg.toFixed(2) + ' mph' : '—'}
        </span>
      </span>
      <span className="text-slate-400">
        Spin Δ <span className={`font-mono ${f.spinDeltaAvg !== null && f.spinDeltaAvg < 0 ? 'text-red-400' : 'text-white'}`}>
          {f.spinDeltaAvg !== null ? (f.spinDeltaAvg > 0 ? '+' : '') + f.spinDeltaAvg.toFixed(0) + ' rpm' : '—'}
        </span>
      </span>
    </div>
  )
}

function HandednessSplits({ pitches }: { pitches: StatcastPitch[] }) {
  const sides = ['L', 'R'] as const
  const types = [...new Set(pitches.map(p => p.pitch_type).filter(Boolean))].sort()
  if (pitches.length === 0) return null
  return (
    <div className="mb-4 mt-2">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">vs LHB / RHB Splits</div>
      <div className="grid grid-cols-2 gap-3">
        {sides.map(side => {
          const group = pitches.filter(p => p.stand === side)
          if (group.length === 0) return null
          // Whiff% is a rate stat over the whole mix and stays meaningful
          // aggregated; velocity is only meaningful per pitch type (a mixed
          // "velo vs LHB" average blends a 98mph fastball with an 82mph
          // curveball into a number nobody can use).
          const w = calcWhiffPct(group)
          return (
            <div key={side} className="bg-navy-800 rounded-lg p-3 border border-navy-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-white">vs {side}HB ({group.length})</div>
                <span className="text-xs text-slate-400">Whiff% <span className="text-white font-mono">{w !== null ? (w * 100).toFixed(1) + '%' : '—'}</span></span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-navy-700">
                    <th className="text-left pb-1">Type</th>
                    <th className="text-right pb-1">Usage</th>
                    <th className="text-right pb-1">Velo</th>
                    <th className="text-right pb-1">Whiff%</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map(t => {
                    const g = group.filter(p => p.pitch_type === t)
                    if (g.length === 0) return null
                    const typeVelo = avg(g.map(p => p.release_speed))
                    const typeWhiff = calcWhiffPct(g)
                    return (
                      <tr key={t} className="border-b border-navy-800/60">
                        <td className="py-1 font-mono" style={{ color: pitchColor(t) }}>{t}</td>
                        <td className="py-1 text-right font-mono text-slate-300">{(g.length / group.length * 100).toFixed(0)}%</td>
                        <td className="py-1 text-right font-mono text-slate-300">{typeVelo?.toFixed(1) ?? '—'}</td>
                        <td className="py-1 text-right font-mono text-slate-300">{typeWhiff !== null ? (typeWhiff * 100).toFixed(1) + '%' : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GameLogTable({
  log, selectedPk, onSelect,
}: {
  log: Record<string, unknown>[]
  selectedPk: number | null
  onSelect: (pk: number) => void
}) {
  const cols = [
    { key: 'date', candidates: ['game_date', 'date', 'gameDate'], label: 'Date' },
    { key: 'opp',  candidates: ['opponent', 'opponent_team_abbreviation', 'opposingTeam'], label: 'Opp' },
    { key: 'ip',   candidates: ['innings_pitched', 'inningsPitched'], label: 'IP' },
    { key: 'h',    candidates: ['hits'], label: 'H' },
    { key: 'er',   candidates: ['earned_runs', 'earnedRuns'], label: 'ER' },
    { key: 'bb',   candidates: ['base_on_balls', 'baseOnBalls'], label: 'BB' },
    { key: 'k',    candidates: ['strike_outs', 'strikeOuts'], label: 'K' },
    { key: 'hr',   candidates: ['home_runs', 'homeRuns'], label: 'HR' },
  ]

  const getVal = (row: Record<string, unknown>, candidates: string[]) => {
    for (const k of candidates) {
      if (row[k] !== null && row[k] !== undefined) return String(row[k])
    }
    return '—'
  }

  const getPk = (row: Record<string, unknown>): number | null => {
    const v = row['game_pk'] ?? row['gamePk'] ?? row['game_id']
    return v !== null && v !== undefined ? Number(v) : null
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr className="border-b border-navy-700 text-slate-500">
            {cols.map(c => <th key={c.key} className="text-left pb-1.5 px-2">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {log.map((row, i) => {
            const pk = getPk(row)
            const isSelected = pk !== null && pk === selectedPk
            return (
              <tr
                key={i}
                onClick={() => pk && onSelect(pk)}
                className={`border-b border-navy-800 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-900/40' : 'hover:bg-navy-800/60'
                }`}
              >
                {cols.map(c => (
                  <td key={c.key} className="py-1.5 px-2 text-slate-300">
                    {getVal(row, c.candidates)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
