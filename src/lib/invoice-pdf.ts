import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { embedWorkspaceLogo } from './workspace-branding'
import { loadWorkspaceProfile } from './workspace-profile'

type InvoiceBrand = { name: string; phone: string; address: string }
type InvoiceTransaction = { id: string; title: string; category: string; amount: number; date: string; status: string; notes: string; paymentAccountName?: string; paymentBankName?: string; paymentAccountNumber?: string; items?: Array<{ description: string; quantity: number; unitPrice: number }> }

const formatRupiah = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`
const safePdfText = (value: string) => value.replace(/[\u0000-\u001f\u007f-\uffff]/g, (character) => {
  const code = character.charCodeAt(0)
  return code >= 0xa0 && code <= 0xff ? character : ' '
}).replace(/\s+/g, ' ').trim()

export async function createInvoicePdf(brand: InvoiceBrand, transaction: InvoiceTransaction, logoBytes?: Uint8Array) {
  const workspace = await loadWorkspaceProfile()
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Invoice ${brand.name}`)
  pdf.setAuthor(workspace.name)
  let page = pdf.addPage([595.28, 841.89])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique)
  const brown = rgb(0.18, 0.09, 0.08)
  const muted = rgb(0.36, 0.34, 0.32)
  const line = rgb(0.78, 0.75, 0.71)
  const white = rgb(1, 1, 1)
  const x = 44
  const width = 507
  const invoiceItems = transaction.items?.length ? transaction.items : [{ description: transaction.title || transaction.category, quantity: 1, unitPrice: transaction.amount }]
  const drawRight = (targetPage: typeof page, text: string, right: number, y: number, size: number, font: typeof regular, color: ReturnType<typeof rgb>) => {
    targetPage.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font, color })
  }
  page.drawText('Invoice', { x, y: 757, size: 38, font: bold, color: brown })
  page.drawText(`Invoice No. INV-${transaction.date.replaceAll('-', '')}-${transaction.id.slice(0, 6).toUpperCase()}`, { x, y: 729, size: 9, font: regular, color: muted })
  const invoiceDate = new Date(`${transaction.date}T12:00:00`)
  page.drawText(`Date: ${invoiceDate.toLocaleDateString('en-GB')}`, { x, y: 714, size: 9, font: regular, color: muted })
  const statusLabel = transaction.status === 'Lunas' ? 'PAID' : 'PAYMENT DUE'
  page.drawText(statusLabel, { x: 250, y: 714, size: 9, font: regular, color: transaction.status === 'Lunas' ? rgb(0.2, 0.48, 0.38) : rgb(0.71, 0.36, 0.22) })
  try {
    const image = logoBytes ? await pdf.embedPng(logoBytes) : await embedWorkspaceLogo(pdf)
    if (image) {
      const size = image.scaleToFit(150, 78)
      page.drawImage(image, { x: 401, y: 731, width: size.width, height: size.height })
    }
  } catch { /* The invoice remains usable without the optional logo image. */ }
  page.drawText('Billed To:', { x, y: 662, size: 18, font: regular, color: brown })
  const clientRows = [
    ['CLIENT NAME', safePdfText(brand.name)],
    ['CONTACT', safePdfText(brand.phone) || '-'],
    ['REGISTERED ADDRESS', safePdfText(brand.address) || '-'],
  ]
  let clientY = 626
  for (const [label, value] of clientRows) {
    page.drawText(label, { x: x + 5, y: clientY, size: 9, font: regular, color: muted })
    page.drawText(value.slice(0, 65), { x: x + 142, y: clientY, size: 11, font: regular, color: brown })
    page.drawLine({ start: { x, y: clientY - 10 }, end: { x: x + width, y: clientY - 10 }, thickness: 0.7, color: line })
    clientY -= 27
  }

  const tableY = 516
  page.drawRectangle({ x, y: tableY - 34, width, height: 34, color: brown })
  page.drawText('DESCRIPTION', { x: x + 9, y: tableY - 22, size: 9, font: bold, color: white })
  page.drawText('QTY', { x: 369, y: tableY - 22, size: 9, font: bold, color: white })
  page.drawText('UNIT PRICE', { x: 408, y: tableY - 22, size: 9, font: bold, color: white })
  page.drawText('AMOUNT', { x: 491, y: tableY - 22, size: 9, font: bold, color: white })
  invoiceItems.forEach((item, index) => {
    const rowY = tableY - 63 - index * 25
    const description = safePdfText(item.description).slice(0, 80) || 'Social media service'
    page.drawText(description, { x: x + 9, y: rowY, size: 9.5, font: regular, color: brown, maxWidth: 260 })
    page.drawText(String(item.quantity), { x: 370, y: rowY, size: 9.5, font: regular, color: brown })
    page.drawText(formatRupiah(item.unitPrice), { x: 405, y: rowY, size: 8.5, font: regular, color: brown })
    page.drawText(formatRupiah(item.quantity * item.unitPrice), { x: 488, y: rowY, size: 8.5, font: regular, color: brown })
    page.drawLine({ start: { x: x + 7, y: rowY - 9 }, end: { x: x + width - 7, y: rowY - 9 }, thickness: 0.35, color: rgb(0.9, 0.88, 0.85) })
  })

  const drawTotals = (targetPage: typeof page, subtotalY: number) => {
    // Keep the summary aligned with the right edge of the Amount column above.
    const amountRight = x + width - 9
    drawRight(targetPage, 'Subtotal', amountRight - 120, subtotalY, 9.5, regular, muted)
    drawRight(targetPage, formatRupiah(transaction.amount), amountRight, subtotalY, 9.5, regular, muted)
    targetPage.drawLine({ start: { x, y: subtotalY - 13 }, end: { x: x + width, y: subtotalY - 13 }, thickness: 0.7, color: line })
    drawRight(targetPage, 'TOTAL', amountRight - 120, subtotalY - 36, 10, bold, brown)
    drawRight(targetPage, formatRupiah(transaction.amount), amountRight, subtotalY - 36, 10, bold, brown)
  }
  const drawPaymentDetails = (targetPage: typeof page, bottom: number) => {
    targetPage.drawRectangle({ x, y: bottom, width: 286, height: 110, color: rgb(0.97, 0.96, 0.94), borderColor: rgb(0.9, 0.87, 0.83), borderWidth: 0.7 })
    targetPage.drawRectangle({ x, y: bottom, width: 3, height: 110, color: rgb(0.94, 0.47, 0.24) })
    targetPage.drawText('Payment details', { x: x + 16, y: bottom + 88, size: 9.5, font: regular, color: brown })
    targetPage.drawText(`Account Name: ${safePdfText(transaction.paymentAccountName || 'Kadek Winda Mei Andani').slice(0, 34)}`, { x: x + 16, y: bottom + 67, size: 8.2, font: regular, color: brown, maxWidth: 250 })
    targetPage.drawLine({ start: { x: x + 16, y: bottom + 56 }, end: { x: x + 270, y: bottom + 56 }, thickness: 0.5, color: line })
    targetPage.drawText(safePdfText(transaction.paymentBankName || 'Bank Central Asia (BCA)').slice(0, 26), { x: x + 16, y: bottom + 37, size: 8, font: regular, color: muted, maxWidth: 155 })
    targetPage.drawText(safePdfText(transaction.paymentAccountNumber || '6115652935').slice(0, 24), { x: x + 16, y: bottom + 19, size: 8, font: bold, color: brown })
  }
  const drawReceivedBy = (targetPage: typeof page, top: number) => {
    targetPage.drawText('Received by:', { x: 350, y: top, size: 13, font: regular, color: brown })
    targetPage.drawLine({ start: { x: 368, y: top - 55 }, end: { x: 528, y: top - 55 }, thickness: 0.8, color: line })
    targetPage.drawText(safePdfText(transaction.paymentAccountName || 'Kadek Winda Mei Andani').slice(0, 42), { x: 360, y: top - 74, size: 9, font: regular, color: brown, maxWidth: 168 })
  }

  if (invoiceItems.length <= 4) {
    const subtotalY = tableY - 34 - invoiceItems.length * 25 - 24
    const paymentBottom = Math.max(170, subtotalY - 175)
    drawTotals(page, subtotalY)
    drawPaymentDetails(page, paymentBottom)
    drawReceivedBy(page, paymentBottom + 83)
    if (transaction.notes.trim()) {
      page.drawText('Notes', { x, y: paymentBottom - 34, size: 8.5, font: regular, color: muted })
      page.drawText(safePdfText(transaction.notes).slice(0, 140), { x, y: paymentBottom - 49, size: 8.5, font: italic, color: muted, maxWidth: width })
    }
    page.drawText(`Thank you for your trust in ${safePdfText(workspace.name)}.`, { x, y: Math.max(55, paymentBottom - (transaction.notes.trim() ? 82 : 56)), size: 9, font: italic, color: muted })
  } else {
    page = pdf.addPage([595.28, 841.89])
    page.drawText('Invoice summary', { x, y: 765, size: 24, font: bold, color: brown })
    page.drawText(`INV-${transaction.date.replaceAll('-', '')}-${transaction.id.slice(0, 6).toUpperCase()}`, { x, y: 741, size: 9, font: regular, color: muted })
    page.drawText(statusLabel, { x: 250, y: 741, size: 9, font: regular, color: transaction.status === 'Lunas' ? rgb(0.2, 0.48, 0.38) : rgb(0.71, 0.36, 0.22) })
    drawTotals(page, 680)
    const paymentBottom = 500
    drawPaymentDetails(page, paymentBottom)
    drawReceivedBy(page, paymentBottom + 83)
    if (transaction.notes.trim()) {
      page.drawText('Notes', { x, y: paymentBottom - 34, size: 8.5, font: regular, color: muted })
      page.drawText(safePdfText(transaction.notes).slice(0, 140), { x, y: paymentBottom - 49, size: 8.5, font: italic, color: muted, maxWidth: width })
    }
    page.drawText(`Thank you for your trust in ${safePdfText(workspace.name)}.`, { x, y: transaction.notes.trim() ? paymentBottom - 82 : paymentBottom - 56, size: 9, font: italic, color: muted })
  }

  pdf.getPages().forEach((targetPage) => {
    targetPage.drawLine({ start: { x, y: 39 }, end: { x: x + width, y: 39 }, thickness: 0.5, color: line })
    targetPage.drawText(safePdfText(workspace.name), { x, y: 25, size: 7, font: regular, color: muted })
  })

  return pdf.save()
}

export async function downloadInvoicePdf(brand: InvoiceBrand, transaction: InvoiceTransaction) {
  const bytes = await createInvoicePdf(brand, transaction)
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const brandSlug = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand'
  anchor.href = href
  anchor.download = `Invoice-${brandSlug}-${transaction.date}.pdf`
  anchor.click()
  URL.revokeObjectURL(href)
}
