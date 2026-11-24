import assert from 'node:assert/strict'
import { test, afterEach } from 'node:test'
import { registerHooks } from 'node:module'
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'

// Run the project's TS modules directly with Node 24, without another test dependency.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.endsWith('.ts')) {
    return nextResolve(`${specifier}.ts`, context)
  }
  return nextResolve(specifier, context)
} })

const { normalizeWorkspaceProfile, publicWorkspaceIdentity, loadWorkspaceProfile, workspaceDocumentPrefix } = await import('../src/lib/workspace-profile.ts')
const { makeSections, makeEnglishSections, resolveWorkspaceName } = await import('../src/lib/client-document-templates.ts')
const { createInvoicePdf } = await import('../src/lib/invoice-pdf.ts')
const { createClientDocumentPdf } = await import('../src/lib/client-document-pdf.ts')
const { createFinanceReportPdf } = await import('../src/lib/finance-report-pdf.ts')
const { fitPdfText } = await import('../src/lib/workspace-branding.ts')
const { contentShareStorageKey, loadStoredContentShare } = await import('../src/lib/content-plan-share-storage.ts')
const { PDFDocument, StandardFonts } = await import('pdf-lib')
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('generic defaults and public identity never expose private profile fields', () => {
  const profile = normalizeWorkspaceProfile({ name: '  Studio One  ', ownerName: 'Private owner', email: 'private@example.test', phone: '123', address: 'Private address', updatedAt: 7 })
  assert.equal(profile.name, 'Studio One')
  assert.deepEqual(publicWorkspaceIdentity(profile), { name: 'Studio One', tagline: 'Agency operating system', updatedAt: 7, themeAccent: 'blue', themeMode: 'light' })
  assert.equal(normalizeWorkspaceProfile({ name: ' ' }).name, 'Agency Workspace')
  assert.equal(normalizeWorkspaceProfile().ownerName, '')
  assert.equal(workspaceDocumentPrefix('Studio One'), 'SO')
})

test('all template variants follow renamed workspaces while preserving client and custom text', () => {
  for (const factory of [makeSections, makeEnglishSections]) {
    for (const type of ['offering', 'agreement']) {
      for (const key of ['custom', 'monthly-smm', 'production-project']) {
        const sections = factory(type, 'Idaman Creative', key)
        const intro = sections[0].body
        assert.ok(intro.includes('{{workspaceName}}'))
        for (const name of ['Studio One', 'A&B $& Studio <Next>']) {
          const resolved = resolveWorkspaceName(intro, name)
          assert.ok(resolved.includes(name))
          assert.ok(resolved.includes('Idaman Creative'), 'a client with the original agency name must remain unchanged')
          assert.ok(!resolved.includes('{{workspaceName}}'))
        }
      }
    }
  }
  assert.equal(resolveWorkspaceName('Custom wording about Idaman Creative.', 'Studio Two'), 'Custom wording about Idaman Creative.')
})

test('profile reads are fresh and failed exports cannot silently use another identity', async () => {
  let currentName = 'Studio One'
  globalThis.fetch = async () => Response.json({ name: currentName })
  assert.equal((await loadWorkspaceProfile()).name, 'Studio One')
  currentName = 'Studio Two'
  assert.equal((await loadWorkspaceProfile()).name, 'Studio Two')
  globalThis.fetch = async () => new Response(null, { status: 401 })
  await assert.rejects(loadWorkspaceProfile(), /Profil workspace gagal dimuat/)
  globalThis.fetch = async () => { throw new Error('Offline') }
  await assert.rejects(loadWorkspaceProfile(), /Offline/)
})

test('invoice, agreement and finance PDFs use current branding after repeated renames', async () => {
  let current = normalizeWorkspaceProfile({ name: 'Studio One', ownerName: 'Configured Signer' })
  const logo = readFileSync('public/brand/workspace-logo.png')
  globalThis.fetch = async (url) => String(url).startsWith('/api/workspace-profile')
    ? Response.json(current)
    : new Response(logo, { headers: { 'Content-Type': 'image/png' } })
  const brand = { name: 'Example Client', owner: 'Client Signer', phone: '', address: '' }
  const transaction = { id: 'invoice-test', title: 'Services', category: 'Project', amount: 1000000, date: '2026-11-24', status: 'Lunas', notes: '' }
  const output = process.env.BRANDING_PDF_OUTPUT
  if (output) mkdirSync(output, { recursive: true })
  for (const [index, name] of ['Studio One', 'A&B Creative Services '.repeat(5).trim()].entries()) {
    current = { ...current, name }
    const pdfs = {
      invoice: await createInvoicePdf(brand, transaction),
      agreement: await createClientDocumentPdf(brand, { type: 'agreement', title: 'Agreement', documentNumber: 'TEST-001', issueDate: '2026-11-24', status: 'Draft', sections: makeSections('agreement', brand.name, 'custom') }),
      finance: await createFinanceReportPdf('2026-11', [], 0),
    }
    for (const [kind, bytes] of Object.entries(pdfs)) {
      const pdf = await PDFDocument.load(bytes)
      assert.equal(pdf.getAuthor(), name)
      assert.ok(pdf.getPageCount() > 0)
      if (output) writeFileSync(join(output, `${index + 1}-${kind}.pdf`), bytes)
    }
  }
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fitted = fitPdfText(current.name, font, 8, 126)
  assert.ok(font.widthOfTextAtSize(fitted, 8) <= 126)
})

test('runtime source contains no installation-specific branding or payment defaults', () => {
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) scan(path)
      else if (/\.(ts|tsx|json)$/.test(path)) assert.doesNotMatch(readFileSync(path, 'utf8'), /idaman|winda|6115652935|9960358691/i, path)
    }
  }
  scan('src')
})

test('existing share links survive the neutral namespace without crossing client boundaries', () => {
  const oldKey = 'idaman-content-plan-share:client-one:2026-11'
  const share = { id: 'share-one', url: '/review?token=test', brandId: 'client-one', brandName: 'Client One', month: '2026-11' }
  const values = new Map([[oldKey, JSON.stringify(share)]])
  const storage = { get length() { return values.size }, key: (index) => [...values.keys()][index] ?? null, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
  assert.equal(loadStoredContentShare(storage, 'client-two', '2026-11'), null)
  assert.deepEqual(loadStoredContentShare(storage, 'client-one', '2026-11'), share)
  assert.equal(values.get(contentShareStorageKey('client-one', '2026-11')), JSON.stringify(share))
  assert.ok(!values.has(oldKey))
})
