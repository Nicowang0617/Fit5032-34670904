import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportCSV(
  data: Record<string, any>[] | Record<string, any>,
  filename = 'export.csv'
) {
  const arr = Array.isArray(data) ? data : [data]
  if (arr.length === 0) return
  const headers = Object.keys(arr[0])

  const esc = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = [
    headers.join(','), 
    ...arr.map(row => headers.map(h => esc(row[h])).join(','))
  ]
  const csv = '\uFEFF' + lines.join('\n') 

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportPDFTable(
  title: string,
  columns: string[],
  data: (string | number)[][],
  filename = 'export.pdf'
) {
  const pdf = new jsPDF()
  pdf.setFontSize(14)
  pdf.text(title, 14, 18)

  autoTable(pdf, {
    head: [columns],
    body: data,
    startY: 24,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [52, 71, 235] }
  })

  pdf.save(filename)
}

export function exportPDFText(
  title: string,
  kv: Record<string, any>,
  filename = 'export.pdf'
) {
  const pdf = new jsPDF()
  let y = 18
  pdf.setFontSize(14)
  pdf.text(title, 14, y)
  pdf.setFontSize(11)
  y += 8
  Object.entries(kv).forEach(([k, v]) => {
    const line = `${k}: ${v ?? ''}`
    const split = pdf.splitTextToSize(line, 180)
    pdf.text(split, 14, y)
    y += 6 + (split.length - 1) * 6
  })
  pdf.save(filename)
}
