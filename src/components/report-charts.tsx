import { Activity, FileText } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type ContentRow = { title: string; format: string; status: string; platforms: string[]; views: number; likes: number; comments: number; shares: number; saves: number }
const formatGroups = [
  { name: 'Carousel', keys: ['carousel'] },
  { name: 'Single Post', keys: ['single post', 'single photo', 'single image', 'photo'] },
  { name: 'Reels', keys: ['reels', 'reel'] },
  { name: 'Story', keys: ['story', 'stories'] },
  { name: 'Feed belum diklasifikasi', keys: ['feed'] },
  { name: 'Video / lainnya', keys: ['video', 'lainnya'] },
]
const formatName = (value: string) => value.trim().toLowerCase()

export function ReportCharts({ content, selectedPlatforms }: { content: ContentRow[]; selectedPlatforms: string[] }) {
  const published = content.filter((item) => item.status === 'Uploaded' && item.platforms.some((platform) => selectedPlatforms.includes(platform)))
  const matchedPlatformRows = content.filter((item) => item.platforms.some((platform) => selectedPlatforms.includes(platform)))
  const performanceRows = matchedPlatformRows.filter((item) => item.views > 0 || item.likes + item.comments + item.shares + item.saves > 0)
  const chartData = formatGroups.map((group) => {
    const rows = published.filter((item) => group.keys.includes(formatName(item.format)))
    const measuredRows = performanceRows.filter((item) => group.keys.includes(formatName(item.format)))
    return {
      format: group.name,
      posts: rows.length,
      views: measuredRows.reduce((sum, row) => sum + row.views, 0),
      engagement: measuredRows.reduce((sum, row) => sum + row.likes + row.comments + row.shares + row.saves, 0),
    }
  })
  const totals = chartData.reduce((sum, row) => ({ posts: sum.posts + row.posts, views: sum.views + row.views, engagement: sum.engagement + row.engagement }), { posts: 0, views: 0, engagement: 0 })
  const tooltipStyle = { background: 'var(--surface)', color: 'var(--ink)', borderRadius: 10, borderColor: 'var(--line)', fontSize: 'var(--text-xs)' }

  return <section className="report-charts">
    <div className="report-chart-heading"><div><div className="eyebrow">3. Grafik hasil konten</div><h3>{selectedPlatforms.join(', ') || 'Belum ada platform dipilih'}</h3><p>{totals.posts} konten tayang · {totals.views.toLocaleString('id-ID')} views · {totals.engagement.toLocaleString('id-ID')} interaksi</p></div></div>
    <div className="report-chart-grid">
      <article className="report-chart-card"><div className="report-chart-title"><FileText size={15} /><div><strong>Jumlah konten tayang</strong><span>Per format · status Uploaded</span></div></div>
        {totals.posts ? <div className="report-chart-plot"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 45 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="format" interval={0} angle={-20} textAnchor="end" height={64} tick={{ fontSize: 'var(--text-xs)', fill: 'var(--muted)' }} /><YAxis allowDecimals={false} tick={{ fontSize: 'var(--text-xs)', fill: 'var(--muted)' }} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value).toLocaleString('id-ID'), 'Konten tayang']} /><Bar dataKey="posts" name="Konten tayang" fill="var(--accent)" radius={[5, 5, 0, 0]} maxBarSize={45} /></BarChart></ResponsiveContainer></div> : <div className="report-chart-empty">Belum ada konten berstatus Uploaded untuk platform terpilih.</div>}
      </article>
      <article className="report-chart-card"><div className="report-chart-title"><Activity size={15} /><div><strong>Hasil keseluruhan</strong><span>Views dan interaksi per format</span></div></div>
        {totals.views || totals.engagement ? <div className="report-chart-plot"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -14, bottom: 45 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="format" interval={0} angle={-20} textAnchor="end" height={64} tick={{ fontSize: 'var(--text-xs)', fill: 'var(--muted)' }} /><YAxis yAxisId="views" tick={{ fontSize: 'var(--text-xs)', fill: 'var(--muted)' }} /><YAxis yAxisId="engagement" orientation="right" tick={{ fontSize: 'var(--text-xs)', fill: 'var(--muted)' }} /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [Number(value).toLocaleString('id-ID'), name]} /><Legend wrapperStyle={{ fontSize: 'var(--text-xs)' }} /><Bar yAxisId="views" dataKey="views" name="Views" fill="var(--accent)" radius={[5, 5, 0, 0]} maxBarSize={38} /><Line yAxisId="engagement" type="monotone" dataKey="engagement" name="Interaksi" stroke="var(--success)" strokeWidth={2} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></div> : <div className="report-chart-empty">Belum ada metrik views atau interaksi pada konten di Content Hub.</div>}
      </article>
    </div>
    <p className="field-hint report-chart-note">Data konten mengikuti platform yang dipilih dan angka yang tercatat di Content Hub.</p>
  </section>
}
