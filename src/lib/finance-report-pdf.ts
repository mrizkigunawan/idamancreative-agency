import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { embedWorkspaceLogo, fitPdfText } from './workspace-branding'
import { loadWorkspaceProfile } from './workspace-profile'

export type FinanceReportRow = {
  id: string
  title: string
  category: string
  type: 'income' | 'expense'
  amount: number
  date: string
  status: string
  notes: string
  brandName: string
  paymentAccountName: string
  paymentBankName: string
  paymentAccountNumber: string
  items: { description: string; quantity: number; unitPrice: number }[]
}

const safeText = (value: unknown) => String(value ?? '').replace(/[\u0000-\u001f\u007f-\uffff]/g, (character) => {
  const code = character.charCodeAt(0)
  return code >= 0xa0 && code <= 0xff ? character : ' '
}).replace(/\s+/g, ' ').trim()

const rupiah = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`

export async function createFinanceReportPdf(month: string, rows: FinanceReportRow[], ytdIncome: number) {
  const workspace = await loadWorkspaceProfile()
  const pdf = await PDFDocument.create()
  const logo = await embedWorkspaceLogo(pdf)
  const period = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))
  pdf.setTitle(`Laporan Keuangan ${period}`)
  pdf.setAuthor(workspace.name)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.18, 0.15, 0.13)
  const muted = rgb(0.48, 0.45, 0.41)
  const border = rgb(0.88, 0.85, 0.81)
  const orange = rgb(0.88, 0.38, 0.16)
  const green = rgb(0.19, 0.49, 0.38)
  const margin = 42
  const pageWidth = 595.28
  const contentWidth = pageWidth - margin * 2
  const paidIncome = rows.filter((row) => row.type === 'income' && row.status === 'Lunas').reduce((sum, row) => sum + row.amount, 0)
  const dueIncome = rows.filter((row) => row.type === 'income' && row.status !== 'Lunas').reduce((sum, row) => sum + row.amount, 0)
  const paidExpense = rows.filter((row) => row.type === 'expense' && row.status === 'Lunas').reduce((sum, row) => sum + row.amount, 0)
  const dueExpense = rows.filter((row) => row.type === 'expense' && row.status !== 'Lunas').reduce((sum, row) => sum + row.amount, 0)
  const net = paidIncome - paidExpense
  let page = pdf.addPage([pageWidth, 841.89])
  let y = 0

  const drawPageHeader = (continued = false) => {
    page.drawText(continued ? 'Rincian transaksi · lanjutan' : 'Laporan Keuangan', { x: margin, y: 792, size: 20, font: bold, color: ink })
    page.drawText(period, { x: margin, y: 772, size: 10, font: regular, color: muted })
    if (logo) { const fitted = logo.scaleToFit(92, 42); page.drawImage(logo, { x: pageWidth - margin - fitted.width, y: 765, width: fitted.width, height: fitted.height }) }
    if (continued) {
      page.drawLine({ start: { x: margin, y: 756 }, end: { x: pageWidth - margin, y: 756 }, thickness: 0.7, color: border })
      y = 738
    }
  }
  const nextPage = () => {
    page = pdf.addPage([pageWidth, 841.89])
    drawPageHeader(true)
  }
  const wrap = (text: string, maxWidth: number, size: number, font = regular) => {
    const words = safeText(text).split(' ').filter(Boolean)
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (line && font.widthOfTextAtSize(next, size) > maxWidth) { lines.push(line); line = word }
      else line = next
    }
    if (line) lines.push(line)
    return lines
  }
  const drawWrapped = (text: string, x: number, top: number, maxWidth: number, size: number, font = regular, color = ink) => {
    const lines = wrap(text, maxWidth, size, font)
    lines.forEach((line, index) => page.drawText(line, { x, y: top - index * (size + 3), size, font, color }))
    return Math.max(1, lines.length) * (size + 3)
  }

  drawPageHeader()
  const summaryY = 700
  page.drawText('Ringkasan periode', { x: margin, y: 738, size: 11, font: bold, color: ink })
  const summary = [
    ['Pemasukan lunas', rupiah(paidIncome), green],
    ['Piutang', rupiah(dueIncome), muted],
    ['Pengeluaran lunas', rupiah(paidExpense), orange],
    ['Tagihan belum dibayar', rupiah(dueExpense), muted],
    ['Laba bersih terealisasi', rupiah(net), net >= 0 ? green : orange],
    ['Pendapatan tahun berjalan', rupiah(ytdIncome), green],
  ] as const
  const summaryGap = 10
  const summaryCardWidth = (contentWidth - summaryGap) / 2
  summary.forEach(([label, amount, color], index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = margin + col * (summaryCardWidth + summaryGap)
    const cardY = summaryY - row * 50
    page.drawRectangle({ x, y: cardY - 34, width: summaryCardWidth, height: 42, color: rgb(0.98, 0.97, 0.95), borderColor: border, borderWidth: 0.6 })
    page.drawText(safeText(label), { x: x + 9, y: cardY - 7, size: 8, font: regular, color: muted })
    page.drawText(safeText(amount), { x: x + 9, y: cardY - 24, size: 10, font: bold, color })
  })
  page.drawText(`Jumlah transaksi: ${rows.length}`, { x: margin, y: 540, size: 9, font: regular, color: muted })
  page.drawLine({ start: { x: margin, y: 526 }, end: { x: pageWidth - margin, y: 526 }, thickness: 0.8, color: border })
  y = 506

  if (!rows.length) {
    page.drawText('Belum ada transaksi pada periode ini.', { x: margin, y, size: 10, font: regular, color: muted })
  }

  for (const [index, row] of rows.entries()) {
    const label = safeText(row.title || row.category || 'Transaksi')
    const client = safeText(row.brandName || '—')
    const invoiceItems = row.items.map((item) => `${item.description} (${item.quantity} × ${rupiah(item.unitPrice)})`).join('; ')
    const account = [row.paymentAccountName, row.paymentBankName, row.paymentAccountNumber].filter(Boolean).map(safeText).join(' · ')
    const meta = `${row.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} · ${safeText(row.category)} · ${safeText(row.status)} · ${new Date(`${row.date}T12:00:00`).toLocaleDateString('id-ID')}`
    const details = [
      `Brand / klien: ${client}`,
      invoiceItems ? `Rincian item: ${invoiceItems}` : '',
      account ? `Rekening: ${account}` : '',
      row.notes ? `Catatan: ${row.notes}` : '',
    ].filter(Boolean)
    const detailLines = details.flatMap((detail) => wrap(detail, contentWidth - 20, 8))
    const blockHeight = 32 + detailLines.length * 11
    if (y - blockHeight < 48) nextPage()
    const amountColor = row.type === 'income' ? green : orange
    page.drawText(`${index + 1}. ${label}`.slice(0, 150), { x: margin + 8, y, size: 9.5, font: bold, color: ink })
    page.drawText(safeText(rupiah(row.amount)), { x: pageWidth - margin - bold.widthOfTextAtSize(safeText(rupiah(row.amount)), 9), y, size: 9, font: bold, color: amountColor })
    y -= 14
    y -= drawWrapped(meta, margin + 8, y, contentWidth - 16, 8, regular, muted)
    for (const detail of details) y -= drawWrapped(detail, margin + 8, y, contentWidth - 16, 8, regular, ink)
    y -= 5
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.45, color: border })
    y -= 13
  }

  pdf.getPages().forEach((target) => {
    target.drawLine({ start: { x: margin, y: 38 }, end: { x: pageWidth - margin, y: 38 }, thickness: 0.5, color: border })
    target.drawText(fitPdfText(safeText(workspace.name), regular, 7, contentWidth - 70), { x: margin, y: 24, size: 7, font: regular, color: muted })
  })

  return pdf.save()
}

export async function downloadFinanceReportPdf(month: string, rows: FinanceReportRow[], ytdIncome: number) {
  const bytes = await createFinanceReportPdf(month, rows, ytdIncome)
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `laporan-keuangan-${month}.pdf`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
