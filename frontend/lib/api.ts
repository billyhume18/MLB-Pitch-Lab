import type { PlayerSearchResult, StatcastPitch } from './types'

const API_BASE = 'http://localhost:8000'

export async function searchPlayers(q: string): Promise<PlayerSearchResult[]> {
  const res = await fetch(`${API_BASE}/api/player/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(`Player search failed: ${res.status}`)
  const text = await res.text()
  if (!text || text.trim() === '[]' || text.trim() === '') return []
  const parsed = JSON.parse(text)
  // Guard against double-encoded responses (parsed would be a string, not array)
  if (!Array.isArray(parsed)) return []
  return parsed as PlayerSearchResult[]
}

export async function getPlayerInfo(mlbamId: number): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/player/info?mlbam_id=${mlbamId}`)
  if (!res.ok) throw new Error(`Player info failed: ${res.status}`)
  const text = await res.text()
  const data = JSON.parse(text)
  return Array.isArray(data) ? data[0] ?? {} : data
}

export async function getSeasonStats(mlbamId: number, season: number) {
  const res = await fetch(`${API_BASE}/api/stats/season?mlbam_id=${mlbamId}&season=${season}`)
  if (!res.ok) throw new Error(`Season stats failed: ${res.status}`)
  const text = await res.text()
  const data = JSON.parse(text)
  return Array.isArray(data) ? data[0] ?? {} : data
}

export async function getCareerStats(mlbamId: number) {
  const res = await fetch(`${API_BASE}/api/stats/career?mlbam_id=${mlbamId}`)
  if (!res.ok) throw new Error(`Career stats failed: ${res.status}`)
  const text = await res.text()
  const data = JSON.parse(text)
  return Array.isArray(data) ? data[0] ?? {} : data
}

export async function getGameLog(mlbamId: number, season: number): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${API_BASE}/api/stats/gamelog?mlbam_id=${mlbamId}&season=${season}`)
  if (!res.ok) throw new Error(`Game log failed: ${res.status}`)
  const text = await res.text()
  const data = JSON.parse(text)
  return Array.isArray(data) ? data : []
}

export async function fetchPitches(
  mlbamId: number,
  startDate: string,
  endDate: string
): Promise<{ pitches: StatcastPitch[]; total: number }> {
  const res = await fetch(
    `${API_BASE}/api/pitches?mlbam_id=${mlbamId}&start_date=${startDate}&end_date=${endDate}`
  )
  if (!res.ok) throw new Error(`Pitch fetch failed: ${res.status}`)
  const text = await res.text()
  return JSON.parse(text)
}

export function getExportUrl(mlbamId: number, startDate: string, endDate: string): string {
  return `${API_BASE}/api/pitches/export?mlbam_id=${mlbamId}&start_date=${startDate}&end_date=${endDate}`
}

export function downloadFilteredCSV(pitches: StatcastPitch[], filename: string) {
  if (pitches.length === 0) return
  const keys = Object.keys(pitches[0])
  const header = keys.join(',')
  const rows = pitches.map(p =>
    keys.map(k => {
      const v = p[k]
      if (v === null || v === undefined) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
