const API_BASE = 'http://localhost:8000'

export type BackendExportFormat = 'csv' | 'xlsx' | 'rds' | 'parquet' | 'pkl'

// CSV also has a fast client-only path (lib/api.ts's downloadFilteredCSV) —
// this one round-trips through the backend, which is required for the other
// four formats (R-native .rds, Arrow-written .parquet, pandas-written .pkl)
// but works for csv too so a single ExportMenu can call one function for all
// non-PDF formats.
export async function exportViaBackend(
  rows: Record<string, unknown>[],
  format: BackendExportFormat,
  filenameBase: string
): Promise<void> {
  if (rows.length === 0) return
  const res = await fetch(`${API_BASE}/api/export/${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, filename: filenameBase }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Export failed (${res.status}): ${text || res.statusText}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenameBase}.${format}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
