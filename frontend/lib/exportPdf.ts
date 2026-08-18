import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

interface PdfColumn { key: string; label: string }

interface PdfReportOptions {
  title: string
  subtitle?: string
  rows: Record<string, unknown>[]
  columns: PdfColumn[]
  chartContainer?: HTMLElement | null
  filenameBase: string
}

// A formatted summary PDF: a title/subtitle, a data table (via
// jspdf-autotable), and — if a chart container element is supplied — a
// rasterized snapshot of whatever charts are currently on screen (via
// html2canvas), appended below or on a new page.
export async function exportPdfReport({
  title, subtitle, rows, columns, chartContainer, filenameBase,
}: PdfReportOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40

  doc.setFontSize(16)
  doc.setTextColor(20)
  doc.text(title, margin, 40)
  let cursorY = 50
  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(subtitle, margin, 58)
    cursorY = 65
  }
  cursorY += 15

  if (rows.length > 0 && columns.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [columns.map(c => c.label)],
      body: rows.map(r => columns.map(c => {
        const v = r[c.key]
        return v === null || v === undefined ? '' : String(v)
      })),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      margin: { left: margin, right: margin },
    })
    const withAutoTable = doc as unknown as { lastAutoTable?: { finalY: number } }
    cursorY = (withAutoTable.lastAutoTable?.finalY ?? cursorY) + 25
  }

  if (chartContainer) {
    const canvas = await html2canvas(chartContainer, { backgroundColor: '#0a1929', scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const maxWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height / canvas.width) * maxWidth

    if (cursorY + Math.min(imgHeight, pageHeight - margin * 2) > pageHeight - margin) {
      doc.addPage()
      cursorY = margin
    }

    // Scale down further if the image is still taller than a full page.
    const availableHeight = pageHeight - margin - cursorY
    const scale = imgHeight > availableHeight ? availableHeight / imgHeight : 1
    doc.addImage(imgData, 'PNG', margin, cursorY, maxWidth * scale, imgHeight * scale)
  }

  doc.save(`${filenameBase}.pdf`)
}
