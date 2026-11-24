import type { ClientDocumentTemplateKey } from './schema'

type DocumentType = 'offering' | 'agreement'
type Section = { heading: string; body: string }
const token = (key: string) => `{{${key}}}`
export const workspaceNameToken = '{{workspaceName}}'
export const resolveWorkspaceName = (body: string, workspaceName: string) => body.replaceAll(workspaceNameToken, () => workspaceName)

const monthlyScopeTemplate = `Platform: ${token('platforms')}\nJumlah konten per platform:\n${token('totalPosts')}\nFormat konten: mix (Reels, Carousel, Single Post)\nStory: ${token('story')} konten per bulan\nVisit/shooting: ${token('visits')} kali per bulan\nMeeting/brainstorming: ${token('meetings')} kali per bulan.`
export const normalizeMonthlyScope = (sections: Section[], templateKey: ClientDocumentTemplateKey) => templateKey !== 'monthly-smm' ? sections : sections.map((section) => section.heading === 'Ruang lingkup dan output' && (section.body.includes(`Reels/video: ${token('reels')} konten per bulan`) || section.body.includes(`Format konten: ${token('postMix')}`)) ? { ...section, body: monthlyScopeTemplate } : section)
export const makeSections = (type: DocumentType, brandName: string, templateKey: ClientDocumentTemplateKey): Section[] => {
  if (templateKey === 'custom') return type === 'offering' ? [
    { heading: 'Ringkasan kebutuhan', body: `Terima kasih telah mempertimbangkan ${workspaceNameToken} untuk mendukung kebutuhan ${brandName}. Penawaran ini merangkum layanan, hasil kerja, dan investasi yang dibahas bersama.` },
    { heading: 'Ruang lingkup pekerjaan', body: 'Jelaskan pekerjaan yang termasuk dalam penawaran ini.' },
    { heading: 'Output dan jadwal', body: 'Jelaskan output, format file, dan waktu penyerahan.' },
    { heading: 'Investasi dan pembayaran', body: 'Jelaskan biaya, termin pembayaran, dan tanggal jatuh tempo.' },
    { heading: 'Ketentuan penawaran', body: 'Jelaskan revisi, kebutuhan client, masa berlaku, dan ketentuan khusus.' },
  ] : [
    { heading: 'Para pihak dan tujuan kerja sama', body: `Perjanjian ini dibuat antara ${workspaceNameToken} dan ${brandName} untuk layanan yang dijelaskan di bawah ini.` },
    { heading: 'Ruang lingkup dan output', body: 'Jelaskan pekerjaan, output, hal yang termasuk, dan pengecualian layanan.' },
    { heading: 'Periode kerja sama', body: 'Jelaskan tanggal mulai, tanggal berakhir, dan perpanjangan.' },
    { heading: 'Biaya dan pembayaran', body: 'Jelaskan biaya, periode tagihan, dan batas waktu pembayaran.' },
    { heading: 'Alur kerja, persetujuan, dan revisi', body: 'Jelaskan tanggung jawab client, feedback, revisi, dan proses persetujuan.' },
    { heading: 'Kepemilikan karya dan kerahasiaan', body: 'Jelaskan hak penggunaan hasil kerja, file yang diserahkan, dan kerahasiaan.' },
    { heading: 'Perubahan dan pengakhiran kerja sama', body: 'Jelaskan add-on, perubahan scope, pembatalan, dan pemberitahuan penghentian.' },
    { heading: 'Persetujuan dan tanda tangan', body: 'Para pihak menyatakan telah membaca dan menyetujui ketentuan yang tertulis.' },
  ]
  const isMonthly = templateKey === 'monthly-smm'
  const scope = monthlyScopeTemplate
  const price = isMonthly ? `Biaya layanan Rp ${token('monthlyFee')} per bulan. Invoice diterbitkan ${token('invoiceDay')}. Pembayaran dilakukan ${token('paymentDueDays')}.` : `Total biaya project Rp ${token('investment')}. Client membayar DP ${token('downPayment')}% ${token('downPaymentDue')}. Sisa pelunasan ${token('finalPayment')}% dibayar ${token('finalPaymentDue')}. Total DP dan pelunasan adalah 100% dari biaya project.`
  const revision = isMonthly ? `Batas revisi ${token('revisionLimit')}. Client memberikan feedback dalam ${token('feedbackDays')}. Perubahan di luar scope disepakati sebagai add-on sebelum dikerjakan.` : `Batas revisi ${token('revisionLimit')}. Raw asset ${token('rawAssetHandover')}. Biaya perjalanan/tambahan ${token('travelCost')}. Perubahan di luar scope akan disepakati terlebih dahulu.`
  if (type === 'offering') return [
    { heading: 'Ringkasan penawaran', body: `Dengan hormat,\n${workspaceNameToken} mengajukan penawaran ${isMonthly ? 'layanan pengelolaan social media bulanan' : `produksi konten untuk project ${token('projectName')}`} kepada ${brandName}. Detail pekerjaan, output, dan investasi tercantum pada dokumen ini.` },
    { heading: 'Ruang lingkup dan output', body: isMonthly ? scope : `Project: ${token('projectName')}\nLokasi: ${token('shootLocation')}\nTanggal shooting: ${token('shootDate')}\nDurasi shooting: ${token('shootDays')} hari\nFoto edit final: ${token('editedPhotos')} foto\nVideo edit final: ${token('editedVideos')} video\nPenyerahan raw asset: ${token('rawAssetHandover')}.` },
    { heading: 'Periode dan jadwal', body: isMonthly ? `Layanan berjalan dari ${token('serviceStart')} sampai ${token('serviceEnd')}. Jadwal produksi dan publikasi disepakati bersama sebelum periode dimulai.` : `Shooting dijadwalkan pada ${token('shootDate')} di ${token('shootLocation')}. Estimasi penyerahan hasil ${token('deliveryDays')} setelah seluruh materi dan kebutuhan produksi tersedia.` },
    { heading: 'Investasi dan pembayaran', body: price },
    { heading: 'Revisi dan ketentuan', body: `${revision}\n${isMonthly ? 'Layanan yang tidak disebutkan di ruang lingkup tidak termasuk dalam biaya bulanan.' : 'Biaya perjalanan/tambahan: ' + token('travelCost') + '.'}` },
    { heading: 'Masa berlaku penawaran', body: `Penawaran ini berlaku sampai ${token('offerValidUntil')}. Detail final dapat disepakati sebelum work agreement ditandatangani.` },
  ]
  return [
    { heading: 'Para pihak dan tujuan kerja sama', body: `Perjanjian ini mengatur layanan ${isMonthly ? 'pengelolaan social media bulanan' : `produksi konten ${token('projectName')}`} antara ${workspaceNameToken} dan ${brandName}.` },
    { heading: 'Ruang lingkup dan output', body: isMonthly ? scope : `Project: ${token('projectName')}\nLokasi: ${token('shootLocation')}\nTanggal shooting: ${token('shootDate')}\nDurasi shooting: ${token('shootDays')} hari\nFoto edit final: ${token('editedPhotos')} foto\nVideo edit final: ${token('editedVideos')} video\nPenyerahan raw asset: ${token('rawAssetHandover')}.` },
    { heading: 'Periode dan jadwal kerja', body: isMonthly ? `Layanan berjalan dari ${token('serviceStart')} sampai ${token('serviceEnd')}. Perpanjangan periode disepakati oleh kedua pihak sebelum periode berakhir.` : `Jadwal shooting: ${token('shootDate')} di ${token('shootLocation')}. Hasil diserahkan dalam ${token('deliveryDays')} setelah produksi dan materi yang diperlukan selesai.` },
    { heading: 'Biaya dan pembayaran', body: price },
    { heading: 'Alur kerja, persetujuan, dan revisi', body: `${revision}\nClient menyiapkan informasi, akses, materi, dan persetujuan yang diperlukan agar pekerjaan berjalan sesuai jadwal.` },
    { heading: 'Kepemilikan karya dan kerahasiaan', body: 'Penggunaan hasil kerja dan raw file mengikuti ruang lingkup yang disepakati. Kedua pihak menjaga informasi nonpublik yang diterima selama kerja sama. Ketentuan portfolio dapat disesuaikan dan disetujui tertulis oleh client.' },
    { heading: 'Perubahan scope dan pengakhiran', body: isMonthly ? `Pekerjaan tambahan di luar scope harus mendapat persetujuan biaya dan jadwal. Penghentian kerja sama diberitahukan ${token('noticeDays')} sebelumnya.` : `Perubahan jadwal atau pembatalan produksi disepakati kedua pihak. Biaya yang sudah dikeluarkan dan pekerjaan yang sudah dilakukan diselesaikan sesuai kesepakatan tertulis.` },
    { heading: 'Persetujuan dan tanda tangan', body: 'Dengan menandatangani dokumen ini, para pihak menyatakan sudah membaca dan menyetujui scope, biaya, periode, serta ketentuan yang tertulis.' },
  ]
}

export const makeEnglishSections = (type: DocumentType, brandName: string, templateKey: ClientDocumentTemplateKey): Section[] => {
  if (templateKey === 'custom') return type === 'offering' ? [
    { heading: 'Summary of Requirements', body: `Thank you for considering ${workspaceNameToken} to support ${brandName}. This offer outlines the services, deliverables, and investment discussed together.` },
    { heading: 'Scope of Work', body: 'Describe the work included in this offer.' },
    { heading: 'Deliverables and Schedule', body: 'Describe the deliverables, file formats, and delivery timeline.' },
    { heading: 'Investment and Payment', body: 'Describe the fee, payment terms, and due dates.' },
    { heading: 'Offer Terms', body: 'Describe revisions, client requirements, validity, and any special terms.' },
  ] : [
    { heading: 'Parties and Purpose of Cooperation', body: `This agreement is made between ${workspaceNameToken} and ${brandName} for the services described below.` },
    { heading: 'Scope of Work and Deliverables', body: 'Describe the work, deliverables, inclusions, and exclusions.' },
    { heading: 'Cooperation Period', body: 'Describe the start date, end date, and renewal terms.' },
    { heading: 'Fees and Payment', body: 'Describe the fees, billing period, and payment deadline.' },
    { heading: 'Workflow, Approval, and Revisions', body: 'Describe client responsibilities, feedback, revisions, and approval process.' },
    { heading: 'Ownership and Confidentiality', body: 'Describe usage rights, delivered files, and confidentiality.' },
    { heading: 'Changes and Termination', body: 'Describe add-ons, scope changes, cancellation, and notice requirements.' },
    { heading: 'Acceptance and Signatures', body: 'The parties confirm that they have read and agree to the terms set out in this document.' },
  ]
  const isMonthly = templateKey === 'monthly-smm'
  const scope = isMonthly
    ? `Platforms: ${token('platforms')}\nContent per platform:\n${token('totalPosts')}\nContent formats: a mix of Reels, carousels, and single-image posts\nStories: ${token('story')} per month\nProduction visits: ${token('visits')} per month\nMeetings / brainstorming: ${token('meetings')} per month.`
    : `Project: ${token('projectName')}\nLocation: ${token('shootLocation')}\nShoot date: ${token('shootDate')}\nShoot duration: ${token('shootDays')} day(s)\nFinal edited photos: ${token('editedPhotos')}\nFinal edited videos: ${token('editedVideos')}\nRaw asset handover: ${token('rawAssetHandover')}.`
  const price = isMonthly ? `Service fee: IDR ${token('monthlyFee')} per month. The invoice will be issued ${token('invoiceDay')}. Payment is due ${token('paymentDueDays')}.` : `Total project fee: IDR ${token('investment')}. A ${token('downPayment')}% deposit is due ${token('downPaymentDue')}. The remaining ${token('finalPayment')}% balance is due ${token('finalPaymentDue')}. The deposit and balance total 100% of the project fee.`
  const revision = isMonthly ? `Revision limit: ${token('revisionLimit')}. The client will provide feedback within ${token('feedbackDays')}. Out-of-scope changes will be agreed as add-ons before work begins.` : `Revision limit: ${token('revisionLimit')}. Raw asset handover: ${token('rawAssetHandover')}. Travel / additional costs: ${token('travelCost')}. Out-of-scope changes will be agreed in advance.`
  if (type === 'offering') return [
    { heading: 'Offer Summary', body: `Dear Client,\n${workspaceNameToken} is pleased to offer ${isMonthly ? 'monthly social media management services' : `content production for the ${token('projectName')} project`} to ${brandName}. The scope, deliverables, and investment are outlined in this document.` },
    { heading: 'Scope of Work and Deliverables', body: scope },
    { heading: 'Period and Schedule', body: isMonthly ? `Services will run from ${token('serviceStart')} to ${token('serviceEnd')}. Production and publication schedules will be agreed before the service period begins.` : `The shoot will take place on ${token('shootDate')} at ${token('shootLocation')}. Final deliverables are estimated within ${token('deliveryDays')} after all required materials and production needs are available.` },
    { heading: 'Investment and Payment', body: price },
    { heading: 'Revisions and Terms', body: `${revision}\n${isMonthly ? 'Services not listed in the scope of work are not included in the monthly fee.' : `Travel / additional costs: ${token('travelCost')}.`}` },
    { heading: 'Offer Validity', body: `This offer is valid until ${token('offerValidUntil')}. Final details may be agreed before the work agreement is signed.` },
  ]
  return [
    { heading: 'Parties and Purpose of Cooperation', body: `This agreement covers ${isMonthly ? 'monthly social media management services' : `content production for ${token('projectName')}`} between ${workspaceNameToken} and ${brandName}.` },
    { heading: 'Scope of Work and Deliverables', body: scope },
    { heading: 'Service Period and Schedule', body: isMonthly ? `Services will run from ${token('serviceStart')} to ${token('serviceEnd')}. Any extension will be agreed by both parties before the period ends.` : `Shoot schedule: ${token('shootDate')} at ${token('shootLocation')}. Deliverables will be provided within ${token('deliveryDays')} after production and required materials are complete.` },
    { heading: 'Fees and Payment', body: price },
    { heading: 'Workflow, Approval, and Revisions', body: `${revision}\nThe client will provide the information, access, materials, and approvals needed to keep the work on schedule.` },
    { heading: 'Ownership and Confidentiality', body: 'Use of work and raw files will follow the agreed scope. Both parties will protect non-public information received during the cooperation. Portfolio use may be adjusted and approved by the client in writing.' },
    { heading: 'Scope Changes and Termination', body: isMonthly ? `Additional work outside the scope requires approval of the fee and schedule. Either party must provide ${token('noticeDays')} notice before ending the cooperation.` : 'Changes to the schedule or production cancellation will be agreed by both parties. Costs incurred and work completed will be settled according to a written agreement.' },
    { heading: 'Acceptance and Signatures', body: 'By signing this agreement, the parties confirm that they have read and agree to the scope, fees, period, and terms set out in this document.' },
  ]
}
