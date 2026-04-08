import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { clearToken } from '../utils/auth'
import CapacityCard from '../components/CapacityCard'

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'new',       label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'archived',  label: 'Archived' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('date')
  const [search, setSearch] = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ sort })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    const data = await api.get(`/submissions?${params}`)
    setEntries(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [statusFilter, sort])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  function handleLogout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.company_name.toLowerCase().includes(search.toLowerCase()) ||
          e.carrier_name.toLowerCase().includes(search.toLowerCase()) ||
          e.city.toLowerCase().includes(search.toLowerCase()) ||
          e.state.toLowerCase().includes(search.toLowerCase())
      )
    : entries

  // Count per status (from unfiltered entries for tab badges)
  const counts = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top nav */}
      <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-400/30 flex items-center justify-center text-lg select-none">
              🚛
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight">Zodiak</span>
              <span className="text-blue-300 font-semibold tracking-tight"> TLS</span>
              <span className="text-blue-300 text-sm ml-2 hidden sm:inline">Capacity Tracker</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs text-blue-300 hover:text-white transition hidden sm:block"
              target="_blank"
              rel="noreferrer"
            >
              View Submit Form ↗
            </a>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={entries.length} color="bg-slate-700" />
          <StatCard label="New" value={counts.new || 0} color="bg-emerald-600" />
          <StatCard label="Contacted" value={counts.contacted || 0} color="bg-blue-600" />
          <StatCard label="Archived" value={counts.archived || 0} color="bg-slate-400" />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Status tabs */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  statusFilter === tab.key
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {tab.key !== 'all' && counts[tab.key] ? (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${statusFilter === tab.key ? 'bg-blue-500' : 'bg-slate-200 text-slate-600'}`}>
                    {counts[tab.key]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44"
          >
            <option value="date">Sort: Date Submitted</option>
            <option value="location">Sort: Location</option>
          </select>

          {/* Search */}
          <input
            type="search"
            placeholder="Search company, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
            Open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
            Enclosed
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <div className="text-5xl mb-3 select-none">📭</div>
            <p className="font-medium">No entries found</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entry) => (
              <CapacityCard key={entry.id} entry={entry} onUpdate={fetchEntries} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className={`${color} rounded-xl text-white px-4 py-3 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-3xl font-extrabold mt-0.5">{value}</p>
    </div>
  )
}
