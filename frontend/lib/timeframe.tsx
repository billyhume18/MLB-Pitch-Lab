'use client'
import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface TimeFrame {
  startDate: string
  endDate: string
  setStartDate: (d: string) => void
  setEndDate: (d: string) => void
  setRange: (start: string, end: string) => void
}

const TimeFrameContext = createContext<TimeFrame | null>(null)

const TODAY = new Date().toISOString().slice(0, 10)
const DEFAULT_START = `${new Date().getFullYear()}-03-01`

export function TimeFrameProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const startDate = searchParams.get('start') ?? DEFAULT_START
  const endDate = searchParams.get('end') ?? TODAY

  const setRange = useCallback((start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('start', start)
    params.set('end', end)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const setStartDate = useCallback((d: string) => setRange(d, endDate), [setRange, endDate])
  const setEndDate   = useCallback((d: string) => setRange(startDate, d), [setRange, startDate])

  const value = useMemo(
    () => ({ startDate, endDate, setStartDate, setEndDate, setRange }),
    [startDate, endDate, setStartDate, setEndDate, setRange]
  )

  return <TimeFrameContext.Provider value={value}>{children}</TimeFrameContext.Provider>
}

export function useTimeFrame(): TimeFrame {
  const ctx = useContext(TimeFrameContext)
  if (!ctx) throw new Error('useTimeFrame must be used within a TimeFrameProvider')
  return ctx
}
