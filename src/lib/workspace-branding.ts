import type { PDFDocument, PDFImage } from 'pdf-lib'

export async function embedWorkspaceLogo(pdf: PDFDocument): Promise<PDFImage | undefined> {
  for (const url of ['/api/workspace-logo', '/brand/idaman-creative-logo.png']) {
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
