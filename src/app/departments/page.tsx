'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { createLesarussClient } from '@/lib/lesaruss-supabase'
import Header from '@/components/Header'

interface Dept {
  id: string
  name: string
  slug: string
  division?: string
  health_status?: string
  audit_status?: string
  ada_score?: number
  overall_score?: number
  layout_score?: number
  content_score?: number
  nav_score?: number
  traffic_rank?: number
  website_url?: string
  wcm_name?: string
  blurb?: string
}

function scoreColor(n?: number | null) {
  if (n == null) return '#9ca3af'
  if (n >= 80) return '#16a34a'
  if (n >= 65) return '#c97a1b'
  return '#dc2626'
}

function ScoreRing({ score }: { score: number | null | undefined }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const pct = score != null ? Math.max(0, Math.min(100, score)) / 100 : 0
  const offset = circ * (1 - pct)
  const color = scoreColor(score)
  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 26 26)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1, color }}>
          {score != null ? score : '–'}
        </span>
      </div>
    </div>
  )
}

function TrafficRing({ rank }: { rank: number | null | undefined }) {
  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="20" fill="none" stroke="#1672A7" strokeWidth="5" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1, color: '#1672A7' }}>
          {rank != null ? `#${rank}` : '–'}
        </span>
      </div>
    </div>
  )
}

function auditLabel(s?: string) {
  if (!s || s === 'not_started' || s === 'Incomplete') return 'Not Started'
  if (s === 'complete' || s === 'Completed') return 'Completed'
  if (s === 'in_progress' || s === 'In Review') return 'In Review'
  if (s === 'Pending Review') return 'Pending Review'
  if (s === 'Pending Updates') return 'Pending Updates'
  return s
}

function auditBadgeStyle(s?: string): React.CSSProperties {
  if (!s || s === 'not_started' || s === 'Incomplete') return { background: '#f3f4f6', color: '#6b7280' }
  if (s === 'complete' || s === 'Completed') return { background: '#dcfce7', color: '#16a34a' }
  if (s === 'in_progress' || s === 'In Review') return { background: '#eff6ff', color: '#1d4ed8' }
  if (s === 'Pending Review') return { background: '#f0f9ff', color: '#0369a1' }
  if (s === 'Pending Updates') return { background: '#fff7ed', color: '#c2410c' }
  return { background: '#f3f4f6', color: '#6b7280' }
}

export default function DepartmentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const lesaruss = createLesarussClient()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [departments, setDepartments] = useState<Dept[]>([])
  const [search, setSearch] = useState('')
  const [divFilter, setDivFilter] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setIsAuthenticated(true)
    })
  }, [supabase, router])

  useEffect(() => {
    if (!isAuthenticated) return
    Promise.all([
      lesaruss.from('bcps_departments')
        .select('id,name,slug,division,health_status,audit_status,ada_score,website_url,wcm_name,blurb')
        .order('name'),
      lesaruss.from('bcps_audit_results')
        .select('department_id,overall_score,layout_score,content_score,nav_score,ada_score,audited_at')
        .order('audited_at', { ascending: false }),
      lesaruss.from('bcps_department_analytics')
        .select('department_id,monthly_visitors'),
    ]).then(([deptRes, auditRes, analyticsRes]) => {
      const depts = deptRes.data ?? []

      const auditMap = new Map<string, {
        overall_score: number; layout_score: number; content_score: number
        nav_score: number; ada_score: number
      }>()
      for (const a of (auditRes.data ?? [])) {
        if (!auditMap.has(a.department_id)) {
          auditMap.set(a.department_id, {
            overall_score: a.overall_score,
            layout_score: a.layout_score,
            content_score: a.content_score,
            nav_score: a.nav_score,
            ada_score: a.ada_score,
          })
        }
      }

      const trafficMap = new Map<string, number>()
      for (const a of (analyticsRes.data ?? [])) {
        const cur = trafficMap.get(a.department_id) ?? 0
        if ((a.monthly_visitors ?? 0) > cur) trafficMap.set(a.department_id, a.monthly_visitors ?? 0)
      }
      const rankMap = new Map<string, number>()
      ;[...trafficMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .forEach(([id], i) => rankMap.set(id, i + 1))

      setDepartments(depts.map(d => ({
        ...d,
        ...(auditMap.get(d.id) ?? {}),
        traffic_rank: rankMap.get(d.id),
      })))
      setIsLoading(false)
    })
  }, [isAuthenticated, lesaruss])

  const divisions = Array.from(new Set(departments.map(d => d.division).filter(Boolean))).sort() as string[]

  const filtered = departments.filter(d => {
    const q = search.toLowerCase().trim()
    if (q && !d.name.toLowerCase().includes(q) && !(d.division ?? '').toLowerCase().includes(q)) return false
    if (divFilter && d.division !== divFilter) return false
    return true
  })

  const audited = departments.filter(d => d.overall_score != null).length
  const avgScore = audited > 0
    ? Math.round(departments.filter(d => d.overall_score != null).reduce((s, d) => s + (d.overall_score ?? 0), 0) / audited)
    : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#EFEFEF' }}>
        <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: '#EFEFEF', borderTopColor: '#1672A7' }} />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEFEF' }}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Departments</h1>
          <p className="text-sm mt-1" style={{ color: '#525252' }}>Web audit scores and traffic rankings across all BCPS departments</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Departments', value: departments.length },
            { label: 'Audited', value: audited },
            { label: 'Avg Score', value: avgScore != null ? avgScore : '–', color: scoreColor(avgScore) },
            { label: 'Pending', value: departments.filter(d => !d.overall_score).length },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#767676' }}>{label}</div>
              <div className="text-2xl font-extrabold" style={{ color: color ?? '#1a1a1a' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input
            type="text"
            placeholder="Search departments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:border-blue-400"
            style={{ color: '#1a1a1a' }}
          />
          <select
            value={divFilter}
            onChange={e => setDivFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
            style={{ color: '#1a1a1a' }}
          >
            <option value="">All Divisions</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="text-xs font-semibold ml-auto" style={{ color: '#767676' }}>
            {filtered.length} of {departments.length} departments
          </span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <p className="font-semibold text-lg" style={{ color: '#525252' }}>No departments found</p>
            <p className="text-sm mt-1" style={{ color: '#767676' }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(dept => (
              <div key={dept.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-0 hover:shadow-md transition-shadow border border-transparent hover:border-blue-200">

                {/* Header: name + rings */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-bold text-sm leading-snug flex-1 min-w-0" style={{ color: '#1a1a1a' }}>
                    {dept.name}
                  </div>
                  <div className="flex items-end gap-2 flex-shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <ScoreRing score={dept.overall_score} />
                      <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: '#767676' }}>Score</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <TrafficRing rank={dept.traffic_rank} />
                      <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: '#767676' }}>Traffic</span>
                    </div>
                  </div>
                </div>

                {/* Division */}
                {dept.division && (
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#1672A7' }}>
                    {dept.division}
                  </div>
                )}

                {/* Blurb */}
                {dept.blurb && (
                  <p className="text-xs leading-relaxed mb-3 flex-1" style={{ color: '#525252' }}>
                    {dept.blurb}
                  </p>
                )}

                {/* Links + audit badge */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  {dept.website_url && (
                    <a
                      href={dept.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold uppercase tracking-wide hover:underline"
                      style={{ color: '#1672A7' }}
                    >
                      Visit Site
                    </a>
                  )}
                  <span
                    className="ml-auto text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                    style={auditBadgeStyle(dept.audit_status)}
                  >
                    {auditLabel(dept.audit_status)}
                  </span>
                </div>

                {/* Sub-scores */}
                <div className="grid grid-cols-4 border-t border-gray-100 pt-3 mt-auto">
                  {(['Layout', 'Content', 'Nav', 'ADA'] as const).map(label => {
                    const key = label === 'Layout' ? 'layout_score'
                      : label === 'Content' ? 'content_score'
                      : label === 'Nav' ? 'nav_score'
                      : 'ada_score'
                    const val = dept[key as keyof Dept] as number | undefined
                    return (
                      <div key={label} className="flex flex-col items-center gap-1 px-1 border-l border-gray-100 first:border-l-0">
                        <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: '#767676' }}>{label}</span>
                        <span className="text-[13px] font-extrabold leading-none" style={{ color: scoreColor(val) }}>
                          {val != null ? val : '–'}
                        </span>
                      </div>
                    )
                  })}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
