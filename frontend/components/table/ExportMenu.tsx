'use client'
import { useState, useRef, useEffect, type RefObject } from 'react'
import { exportViaBackend, type BackendExportFormat } from '@/lib/exportFile'
import { exportPdfReport } from '@/lib/exportPdf'
import { downloadFilteredCSV } from '@/lib/api'

interface PdfColumn { key: string; label: string }

interface Props {
  rows: Record<string, unknown>[]
  filenameBase: string
  label?: string
  className?: string
  pdfTitle?: string
  pdfSubtitle?: string
  pdfColumns?: PdfColumn[]
  chartContainerRef?: RefObject<HTMLElement>
}

const FORMATS: { id: BackendExportFormat | 'pdf'; label: string; hint: string }[] = [
  { id: 'csv',     label: 'CSV',     hint: '.csv' },
  { id: 'xlsx',    label: 'Excel',   hint: '.xlsx' },
  { id: 'pdf',     label: 'PDF Report', hint: '.pdf' },
  { id: 'rds',     label: 'R (.rds)', hint: '.rds' },
  { id: 'parquet', label: 'Parquet', hint: '.parquet' },
  { id: 'pkl',     label: 'Python Pickle', hint: '.pkl' },
]

export default function ExportMenu({
  rows, filenameBase, label = 'Export', className = '',
  pdfTitle, pdfSubtitle, pdfColumns, chartContainerRef,
}: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const columns: PdfColumn[] = pdfColumns ?? (rows.length > 0 ? Object.keys(rows[0]).map(k => ({ key: k, label: k })) : [])

  const handleExport = async (fmt: BackendExportFormat | 'pdf') => {
    setBusy(fmt)
    setError(null)
    try {
      if (fmt === 'csv') {
        downloadFilteredCSV(rows, `${filenameBase}.csv`)
      } else if (fmt === 'pdf') {
        await exportPdfReport({
          title: pdfTitle ?? filenameBase,
          subtitle: pdfSubtitle,
          rows,
          columns,
          chartContainer: chartContainerRef?.current ?? null,
          filenameBase,
        })
      } else {
        await exportViaBackend(rows, fmt, filenameBase)
      }
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={rows.length === 0}
        className={`px-3 py-1.5 rounded border border-slate-600 text-xs text-slate-300 hover:bg-navy-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {label} ({rows.length.toLocaleString()}) ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-navy-900 border border-navy-600 rounded shadow-xl w-48 py-1">
          {FORMATS.map(f => (
            <button
              key={f.id}
              onClick={() => handleExport(f.id)}
              disabled={busy !== null}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:bg-navy-800 hover:text-white disabled:opacity-40"
            >
              <span>{f.label}</span>
              <span className="text-slate-500 font-mono">{busy === f.id ? '…' : f.hint}</span>
            </button>
          ))}
          {error && <div className="px-3 py-1.5 text-xs text-red-400 border-t border-navy-700">{error}</div>}
        </div>
      )}
    </div>
  )
}
