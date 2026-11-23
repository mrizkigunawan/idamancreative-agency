import { blob, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(), name: text('name').notNull(), industry: text('industry').notNull().default(''),
  owner: text('owner').notNull().default(''), phone: text('phone').notNull().default(''), handle: text('handle').notNull().default(''),
  retainer: integer('retainer').notNull().default(0), color: text('color').notNull().default('#ef783c'), address: text('address').notNull().default(''),
  notes: text('notes').notNull().default(''), platformLinks: text('platform_links', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
  handledPlatforms: text('handled_platforms', { mode: 'json' }).$type<string[]>().notNull().default([]),
  canvaFeedUrl: text('canva_feed_url').notNull().default(''), canvaCoverUrl: text('canva_cover_url').notNull().default(''), canvaStoryUrl: text('canva_story_url').notNull().default(''),
  customLinks: text('custom_links', { mode: 'json' }).$type<{ id: string; group: 'social' | 'canva' | 'other'; title: string; url: string }[] | null>(),
  sowReels: integer('sow_reels').notNull().default(0), sowFeed: integer('sow_feed').notNull().default(0),
  sowStory: integer('sow_story').notNull().default(0), sowVisit: integer('sow_visit').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), createdAt: integer('created_at').notNull(),
})
export const brandDecks = sqliteTable('brand_decks', {
  id: text('id').primaryKey(), brandId: text('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(), fileData: blob('file_data', { mode: 'buffer' }).notNull(),
  sizeBytes: integer('size_bytes').notNull(), uploadedAt: integer('uploaded_at').notNull(),
})
export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(), name: text('name').notNull(), brand: text('brand').notNull().default(''), model: text('model').notNull().default(''),
  category: text('category').notNull().default(''), serialNumber: text('serial_number').notNull().default(''), buyerName: text('buyer_name').notNull().default(''),
  purchaseDate: text('purchase_date'), purchaseMethod: text('purchase_method').notNull().default(''), purchaseDetails: text('purchase_details').notNull().default(''),
  purchasePrice: integer('purchase_price').notNull().default(0), quantity: integer('quantity').notNull().default(1),
  condition: text('condition').notNull().default('Baik'), status: text('status').notNull().default('Digunakan'), location: text('location').notNull().default(''), notes: text('notes').notNull().default(''),
  linkedTransactionId: text('linked_transaction_id'),
  receiptData: blob('receipt_data', { mode: 'buffer' }), receiptFilename: text('receipt_filename'), receiptMime: text('receipt_mime'), receiptSizeBytes: integer('receipt_size_bytes'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
})
export const contents = sqliteTable('contents', {
  id: text('id').primaryKey(), brandId: text('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), format: text('format').notNull(), date: text('date').notNull(), status: text('status').notNull().default('Ideation'),
  platforms: text('platforms', { mode: 'json' }).$type<string[]>().notNull().default([]), inspo: text('inspo').notNull().default(''), hook: text('hook').notNull().default(''),
  brief: text('brief').notNull().default(''), caption: text('caption').notNull().default(''),
  pillar: text('pillar').notNull().default(''), funnel: text('funnel').notNull().default(''), objective: text('objective').notNull().default(''),
  sceneBreakdown: text('scene_breakdown').notNull().default(''), hashtags: text('hashtags').notNull().default(''), cta: text('cta').notNull().default(''),
  postingTime: text('posting_time').notNull().default('09:00'), thumbnailUrl: text('thumbnail_url').notNull().default(''), internalNotes: text('internal_notes').notNull().default(''), feedOrder: integer('feed_order'),
  views: integer('views').notNull().default(0),
  likes: integer('likes').notNull().default(0), comments: integer('comments').notNull().default(0), shares: integer('shares').notNull().default(0), saves: integer('saves').notNull().default(0),
})
export const contentPlanShares = sqliteTable('content_plan_shares', {
  id: text('id').primaryKey(), brandId: text('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  contentId: text('content_id').references(() => contents.id, { onDelete: 'cascade' }), month: text('month').notNull(), tokenHash: text('token_hash').notNull().unique(), createdAt: integer('created_at').notNull(), expiresAt: integer('expires_at').notNull(), revokedAt: integer('revoked_at'),
})
export const contentPlanComments = sqliteTable('content_plan_comments', {
  id: text('id').primaryKey(), shareId: text('share_id').notNull().references(() => contentPlanShares.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(), body: text('body').notNull(), createdAt: integer('created_at').notNull(),
})
export const contentThumbnails = sqliteTable('content_thumbnails', {
  contentId: text('content_id').primaryKey().references(() => contents.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(), mime: text('mime').notNull(), fileData: blob('file_data', { mode: 'buffer' }).notNull(),
  sizeBytes: integer('size_bytes').notNull(), updatedAt: integer('updated_at').notNull(),
})
export const workspaceBranding = sqliteTable('workspace_branding', {
  id: text('id').primaryKey(), filename: text('filename').notNull(), mime: text('mime').notNull(),
  fileData: blob('file_data', { mode: 'buffer' }).notNull(), sizeBytes: integer('size_bytes').notNull(), updatedAt: integer('updated_at').notNull(),
})
export const workspaceProfile = sqliteTable('workspace_profile', {
  id: text('id').primaryKey(), name: text('name').notNull().default('Idaman Creative'), tagline: text('tagline').notNull().default('Agency operating system'),
  ownerName: text('owner_name').notNull().default(''), email: text('email').notNull().default(''), phone: text('phone').notNull().default(''),
  address: text('address').notNull().default(''), website: text('website').notNull().default(''), updatedAt: integer('updated_at').notNull(),
})
export const brandSocialProfiles = sqliteTable('brand_social_profiles', {
  brandId: text('brand_id').primaryKey().references(() => brands.id, { onDelete: 'cascade' }),
  profilePictureUrl: text('profile_picture_url').notNull().default(''), username: text('username').notNull().default(''), displayName: text('display_name').notNull().default(''),
  bio: text('bio').notNull().default(''), highlights: text('highlights', { mode: 'json' }).$type<{ id: string; title: string; coverUrl: string; sortOrder: number }[]>().notNull().default([]),
  pinnedContentIds: text('pinned_content_ids', { mode: 'json' }).$type<string[]>().notNull().default([]), updatedAt: integer('updated_at').notNull(),
})
export const visits = sqliteTable('visits', {
  id: text('id').primaryKey(), brandId: text('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), time: text('time').notNull().default('09:00'), location: text('location').notNull().default(''), notes: text('notes').notNull().default(''),
})
export const brandNotes = sqliteTable('brand_notes', {
  id: text('id').primaryKey(), brandId: text('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), category: text('category').notNull().default('Lainnya'), details: text('details').notNull().default(''),
  dueDate: text('due_date'), isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
})
export type ClientDocumentSection = { heading: string; body: string }
export type ClientDocumentTemplateKey = 'monthly-smm' | 'production-project' | 'custom'
export const prospects = sqliteTable('prospects', {
  id: text('id').primaryKey(), brandName: text('brand_name').notNull(), picName: text('pic_name').notNull().default(''), contact: text('contact').notNull().default(''),
  estimatedValue: integer('estimated_value').notNull().default(0), status: text('status').notNull().default('Prospek'), sow: text('sow').notNull().default(''), notes: text('notes').notNull().default(''),
  nextFollowUpDate: text('next_follow_up_date'), nextAction: text('next_action').notNull().default(''),
})
export const clientDocuments = sqliteTable('client_documents', {
  id: text('id').primaryKey(), brandId: text('brand_id').references(() => brands.id, { onDelete: 'cascade' }),
  prospectId: text('prospect_id').references(() => prospects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), title: text('title').notNull(), documentNumber: text('document_number').notNull().default(''),
  templateKey: text('template_key').notNull().default('custom'), templateFields: text('template_fields', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
  issueDate: text('issue_date').notNull(), status: text('status').notNull().default('Draft'),
  sections: text('sections', { mode: 'json' }).$type<ClientDocumentSection[]>().notNull().default([]),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
})
export type InvoiceLineItem = { description: string; quantity: number; unitPrice: number }
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(), brandId: text('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  inventoryItemId: text('inventory_item_id'),
  manualClientName: text('manual_client_name').notNull().default(''), manualClientPhone: text('manual_client_phone').notNull().default(''), manualClientAddress: text('manual_client_address').notNull().default(''),
  type: text('type').notNull(), title: text('title').notNull(), category: text('category').notNull(),
  amount: integer('amount').notNull(), items: text('items', { mode: 'json' }).$type<InvoiceLineItem[]>().notNull().default([]),
  paymentAccountName: text('payment_account_name').notNull().default('Kadek Winda Mei Andani'), paymentBankName: text('payment_bank_name').notNull().default('Bank Central Asia (BCA)'), paymentAccountNumber: text('payment_account_number').notNull().default('6115652935'),
  date: text('date').notNull(), status: text('status').notNull().default('Lunas'), notes: text('notes').notNull().default(''),
})

export type SocialReportPlatformMetrics = {
  followersStart: number | null; followersEnd: number | null; views: number | null; reach: number | null; profileVisits: number | null; linkClicks: number | null;
  likes: number | null; comments: number | null; shares: number | null; saves: number | null; salesValue: number | null; productsSold: number | null; salesValueHidden?: boolean;
}
export const socialReports = sqliteTable('social_reports', {
  id: text('id').primaryKey(), brandId: text('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  month: text('month').notNull(), status: text('status').notNull().default('Draft'), platforms: text('platforms', { mode: 'json' }).$type<string[]>().notNull().default([]),
  metrics: text('metrics', { mode: 'json' }).$type<Record<string, SocialReportPlatformMetrics>>().notNull().default({}),
  summary: text('summary').notNull().default(''), insights: text('insights').notNull().default(''), nextPlan: text('next_plan').notNull().default(''),
  referenceImage: blob('reference_image', { mode: 'buffer' }), referenceFilename: text('reference_filename'), referenceMime: text('reference_mime'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [uniqueIndex('social_reports_brand_month_unique').on(table.brandId, table.month)])
export const socialReportAttachments = sqliteTable('social_report_attachments', {
  id: text('id').primaryKey(), reportId: text('report_id').notNull().references(() => socialReports.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''), platform: text('platform').notNull().default('Instagram'), filename: text('filename').notNull(), mime: text('mime').notNull(),
  fileData: blob('file_data', { mode: 'buffer' }).notNull(), sizeBytes: integer('size_bytes').notNull(),
  sortOrder: integer('sort_order').notNull().default(0), cropX: integer('crop_x').notNull().default(0), cropY: integer('crop_y').notNull().default(0),
  cropWidth: integer('crop_width').notNull().default(100), cropHeight: integer('crop_height').notNull().default(100), imageWidth: integer('image_width').notNull().default(0), imageHeight: integer('image_height').notNull().default(0),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
})

export const authUsers = sqliteTable('user', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(), emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'), createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})
