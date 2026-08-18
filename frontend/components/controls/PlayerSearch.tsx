'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { searchPlayers } from '@/lib/api'
import type { PlayerSearchResult } from '@/lib/types'

interface Props {
  onSelect: (p: PlayerSearchResult) => void
  selected: PlayerSearchResult | null
}

const playerLabel = (p: PlayerSearchResult | null) =>
  p ? `${p.name_first ?? ''} ${p.name_last ?? ''}`.trim() : ''

export default function PlayerSearch({ onSelect, selected }: Props) {
  const [query, setQuery]   = useState(playerLabel(selected))
  const [results, setResults] = useState<PlayerSearchResult[]>([])
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQuery(playerLabel(selected))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const data = await searchPlayers(q)
      setResults(data)
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 300)
  }

  const handleSelect = (p: PlayerSearchResult) => {
    const normalized: PlayerSearchResult = { ...p, key_mlbam: Number(p.key_mlbam) }
    setQuery(playerLabel(normalized))
    setOpen(false)
    setResults([])
    onSelect(normalized)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search pitcher..."
          className="w-full bg-navy-800 border border-navy-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        {loading && (
          <div className="absolute right-2 top-2.5">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-navy-800 border border-navy-600 rounded shadow-xl max-h-64 overflow-auto">
          {results.map((p, i) => (
            <button
              key={p.key_mlbam ?? i}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 hover:bg-navy-700 text-sm"
            >
              <span className="text-white font-medium">
                {p.name_first ?? ''} {p.name_last ?? ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
