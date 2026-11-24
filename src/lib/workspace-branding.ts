import type { PDFDocument, PDFFont, PDFImage } from 'pdf-lib'
import { defaultWorkspaceLogo } from './workspace-profile'

export function fitPdfText(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let result = text
  while (result && font.widthOfTextAtSize(`${result}...`, size) > maxWidth) result = result.slice(0, -1)
  return `${result}...`
}

export async function embedWorkspaceLogo(pdf: PDFDocument): Promise<PDFImage | undefined> {
  for (const url of ['/api/workspace-logo', defaultWorkspaceLogo]) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) continue
      const bytes = new Uint8Array(await response.arrayBuffer())
      const mime = response.headers.get('Content-Type')?.split(';')[0]
      if (mime === 'image/jpeg' || url.endsWith('.jpg')) return await pdf.embedJpg(bytes)
      return await pdf.embedPng(bytes)
    } catch { /* Try the built-in logo if the workspace logo is unavailable. */ }
  }
  return undefined
}
