import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { embedWorkspaceLogo, fitPdfText } from './workspace-branding'
import { loadWorkspaceProfile } from './workspace-profile'
import { resolveWorkspaceName } from './client-document-templates'
import type { brands, clientDocuments } from './schema'

type Brand = typeof brands.$inferSelect
type ClientDocument = Pick<typeof clientDocuments.$inferSelect, 'type' | 'title' | 'documentNumber' | 'issueDate' | 'status' | 'sections'> & { language?: 'id' | 'en' }
const clean = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\u0000-\u001f\u007f-\uffff]/g, ' ').replace(/\s+/g, ' ').trim()
const titleCase = (value: string) => {
  const lowercaseConnectors = new Set(['dan', 'atau', 'yang', 'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 'dalam', 'oleh', 'sebagai', 'terhadap', 'serta', 'hingga', 'tentang'])
  let firstWord = true
  return value.split(/(\s+)/).map((part) => {
    if (!part || /^\s+$/.test(part)) return part
    const normalized = part.toLocaleLowerCase('id-ID')
    const result = !firstWord && lowercaseConnectors.has(normalized) ? normalized : part[0].toLocaleUpperCase('id-ID') + part.slice(1)
    firstWord = false
    return result
  }).join('')
}
const dateLabel = (value: string, language: 'id' | 'en' = 'id') => { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString(language === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) }

export async function createClientDocumentPdf(brand: Brand, document: ClientDocument) {
  const workspace = await loadWorkspaceProfile()
  const pdf = await PDFDocument.create()
  const printTitle = `${document.type === 'offering' ? 'Offering Letter' : 'Work Agreement'} - ${brand.name}`
  pdf.setTitle(printTitle)
  pdf.setAuthor(workspace.name)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique)
  const ink = rgb(0.16, 0.14, 0.12)
  const muted = rgb(0.46, 0.43, 0.39)
  const orange = rgb(0.91, 0.39, 0.18)
  const line = rgb(0.88, 0.85, 0.81)
  const paper = rgb(0.98, 0.97, 0.95)
  const width = 595.28
  const height = 841.89
  const margin = 54
  const contentWidth = width - margin * 2
  const pages: ReturnType<typeof pdf.addPage>[] = []
  let page = pdf.addPage([width, height])
  pages.push(page)
  let y = 0
  const addPage = () => { page = pdf.addPage([width, height]); pages.push(page); y = height - 68 }
  const ensure = (space: number) => { if (y - space < 66) addPage() }
  const wrap = (text: string, font: typeof regular, size: number, maxWidth: number) => {
    const lines: string[] = []
    for (const paragraph of text.split(/\n/)) {
      const words = clean(paragraph).split(' ').filter(Boolean)
      if (!words.length) { lines.push(''); continue }
      let current = ''
      for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (font.widthOfTextAtSize(next, size) > maxWidth && current) { lines.push(current); current = word }
        else current = next
      }
      if (current) lines.push(current)
    }
    return lines
  }
  const drawParagraph = (text: string, options: { font?: typeof regular; size?: number; color?: ReturnType<typeof rgb>; indent?: number; lineHeight?: number; alignLabels?: boolean } = {}) => {
    const font = options.font ?? regular
    const size = options.size ?? 10
    const lineHeight = options.lineHeight ?? size * 1.55
    for (const paragraph of text.split('\n')) {
      const bullet = Boolean(options.alignLabels) && /^\s*[-•]\s*/.test(paragraph)
      const rowText = bullet ? paragraph.trim().replace(/^[-•]\s*/, '') : paragraph
      const labelRow = rowText.match(/^([^:]{1,60})\s*:\s*(.*)$/)
      if (options.alignLabels && labelRow) {
        ensure(lineHeight)
        const baseIndent = (options.indent ?? 0) + (bullet ? 24 : 0)
        const labelColumn = bullet ? 68 : 150
        const valueIndent = baseIndent + labelColumn + 8
        if (bullet) page.drawText('-', { x: margin + baseIndent, y, size, font, color: options.color ?? ink })
        page.drawText(labelRow[1].trim(), { x: margin + baseIndent + (bullet ? 10 : 0), y, size, font, color: options.color ?? ink })
        page.drawText(':', { x: margin + baseIndent + labelColumn, y, size, font, color: options.color ?? ink })
        const valueLines = wrap(labelRow[2], font, size, contentWidth - valueIndent)
        for (const lineText of valueLines) {
          ensure(lineHeight)
          if (lineText) page.drawText(lineText, { x: margin + valueIndent, y, size, font, color: options.color ?? ink })
          y -= lineHeight
        }
        continue
      }
      const indent = (options.indent ?? 0) + (bullet ? 24 : 0)
      const content = bullet ? `- ${paragraph.trim().replace(/^[-•]\s*/, '')}` : paragraph
      const lines = wrap(content, font, size, contentWidth - indent)
      for (const lineText of lines) {
        ensure(lineHeight)
        if (lineText) page.drawText(lineText, { x: margin + indent, y, size, font, color: options.color ?? ink })
        y -= lineHeight
      }
    }
  }

  // Cover header with a compact identity and document reference.
  page.drawRectangle({ x: 0, y: height - 12, width, height: 12, color: orange })
  try {
    const logo = await embedWorkspaceLogo(pdf)
    if (logo) {
      const fitted = logo.scaleToFit(105, 48)
      page.drawImage(logo, { x: margin, y: height - 77, width: fitted.width, height: fitted.height })
    }
  } catch { /* Use the text identity if the logo is unavailable. */ }
  page.drawText(fitPdfText(clean(workspace.name.toLocaleUpperCase('id-ID')), bold, 8, 126), { x: width - margin - 126, y: height - 47, size: 8, font: bold, color: muted })
  const titleLines = wrap(clean(printTitle), bold, 16, contentWidth)
  y = height - 123
  for (const titleLine of titleLines.slice(0, 2)) { page.drawText(titleLine, { x: margin, y, size: 16, font: bold, color: ink }); y -= 21 }
  y -= 7
  page.drawRectangle({ x: margin, y: y - 61, width: contentWidth, height: 72, color: paper })
  page.drawText('CLIENT', { x: margin + 14, y: y - 9, size: 7.5, font: bold, color: muted })
  page.drawText(clean(brand.name).slice(0, 80), { x: margin + 14, y: y - 25, size: 12, font: bold, color: ink })
  page.drawText(clean(brand.owner || 'PIC belum diisi').slice(0, 80), { x: margin + 14, y: y - 41, size: 9, font: regular, color: muted })
  page.drawText(document.language === 'en' ? 'DOCUMENT NUMBER' : 'NOMOR DOKUMEN', { x: margin + 275, y: y - 9, size: 7.5, font: bold, color: muted })
  page.drawText(clean(document.documentNumber || '-').slice(0, 60), { x: margin + 275, y: y - 25, size: 9, font: regular, color: ink })
  page.drawText(`${document.language === 'en' ? 'Date' : 'Tanggal'}: ${dateLabel(document.issueDate, document.language)}`, { x: margin + 275, y: y - 42, size: 8.5, font: regular, color: muted })
  y -= 91

  if (document.status === 'Draft') {
    page.drawText(document.language === 'en' ? 'DRAFT - REVIEW AND FINALIZE BEFORE SENDING' : 'DRAFT - PERIKSA DAN SESUAIKAN SEBELUM DIKIRIM', { x: margin, y, size: 8, font: bold, color: orange })
    y -= 23
  }
  for (const [index, section] of document.sections.entries()) {
    const heading = clean(section.heading)
    const body = resolveWorkspaceName(section.body, workspace.name).trim()
    if (!heading && !body) continue
    ensure(48)
    if (heading) {
      page.drawRectangle({ x: margin, y: y - 5, width: 3, height: 16, color: orange })
      page.drawText(`${index + 1}. ${titleCase(heading)}`.slice(0, 150), { x: margin + 11, y, size: 11, font: bold, color: ink, maxWidth: contentWidth - 12 })
      y -= 22
    }
    if (body) { const scopeHeading = heading.toLocaleLowerCase('id-ID'); drawParagraph(body, { size: 9.5, color: muted, indent: 11, alignLabels: scopeHeading === 'ruang lingkup dan output' || scopeHeading === 'scope of work and deliverables' }); y -= 13 }
  }

  if (document.type === 'agreement') {
    ensure(135)
    y -= 4
    page.drawText(document.language === 'en' ? 'ACCEPTANCE AND SIGNATURES' : 'PERSETUJUAN PARA PIHAK', { x: margin, y, size: 9, font: bold, color: orange })
    y -= 22
    const colWidth = (contentWidth - 28) / 2
    for (const [index, role] of (document.language === 'en' ? ['SERVICE PROVIDER', 'CLIENT'] : ['PENYEDIA JASA', 'CLIENT']).entries()) {
      const colX = margin + index * (colWidth + 28)
      page.drawRectangle({ x: colX, y: y - 100, width: colWidth, height: 100, borderColor: line, borderWidth: 0.8, color: rgb(1, 1, 1) })
      page.drawText(role, { x: colX + 12, y: y - 18, size: 7.5, font: bold, color: muted })
      page.drawLine({ start: { x: colX + 12, y: y - 68 }, end: { x: colX + colWidth - 12, y: y - 68 }, thickness: 0.7, color: line })
      page.drawText(fitPdfText(clean(index === 0 ? workspace.ownerName || workspace.name : brand.owner || brand.name), regular, 8.5, colWidth - 24), { x: colX + 12, y: y - 86, size: 8.5, font: regular, color: ink })
    }
  }

  pages.forEach((target, index) => {
    target.drawLine({ start: { x: margin, y: 43 }, end: { x: width - margin, y: 43 }, thickness: 0.6, color: line })
    target.drawText(fitPdfText(`${clean(workspace.name)}  ·  ${clean(document.documentNumber || document.title).slice(0, 54)}`, italic, 7, contentWidth - 50), { x: margin, y: 29, size: 7, font: italic, color: muted })
    target.drawText(`${index + 1} / ${pages.length}`, { x: width - margin - 35, y: 29, size: 7, font: regular, color: muted })
  })
  return pdf.save()
}

export async function downloadClientDocumentPdf(brand: Brand, document: ClientDocument) {
  const bytes = await createClientDocumentPdf(brand, document)
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const href = URL.createObjectURL(blob)
  const anchor = documentCreateAnchor()
  anchor.href = href
  const slug = `${brand.name}-${document.title}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client-document'
  anchor.download = `${slug}.pdf`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}
function documentCreateAnchor() { return window.document.createElement('a') }
