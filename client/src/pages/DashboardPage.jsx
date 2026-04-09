import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { clearToken } from '../utils/auth'
import MapView from '../components/MapView'
import DetailPanel from '../components/DetailPanel'

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
  const [selectedEntry, setSelectedEntry] = useState(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const data = await api.get(`/submissions?${params}`)
      const list = Array.isArray(data) ? data : []
      setEntries(list)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sort])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Keep selected entry in sync with entries list
  useEffect(() => {
    if (selectedEntry) {
      const updated = entries.find((e) => e.id === selectedEntry.id)
      if (updated) {
        setSelectedEntry(updated)
      } else {
        setSelectedEntry(null)
      }
    }
  }, [entries])

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

  // For map display: hide archived by default unless explicitly viewing archived tab
  const mapEntries = statusFilter === 'archived'
    ? filtered
    : filtered.map((e) => ({ ...e, _dimmed: e.status === 'archived' }))

  // Count per status (from unfiltered entries for tab badges)
  const counts = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Top nav */}
      <header className="bg-blue-900 text-white shadow-lg z-20 flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
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

      {/* Controls bar */}
      <div className="bg-white border-b border-slate-200 z-10 flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Summary stats */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <StatPill label="Total" value={entries.length} className="bg-slate-700 text-white" />
            <StatPill label="New" value={counts.new || 0} className="bg-emerald-600 text-white" />
            <StatPill label="Contacted" value={counts.contacted || 0} className="bg-blue-600 text-white" />
            <StatPill label="Archived" value={counts.archived || 0} className="bg-slate-400 text-white" />
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status tabs */}
            <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 flex-wrap">
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
              className="flex-1 border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            />

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-slate-500 sm:ml-auto">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                Open
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                Enclosed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-2 animate-pulse">🗺️</div>
              <p className="font-medium">Loading map…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="text-5xl mb-3 select-none">📭</div>
            <p className="font-medium">No entries found</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <MapView
            entries={filtered}
            onSelect={setSelectedEntry}
            selectedId={selectedEntry?.id}
          />
        )}

      </div>

      {/* Side panel */}
      {selectedEntry && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-[999] sm:bg-transparent"
            onClick={() => setSelectedEntry(null)}
          />
          <DetailPanel
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onUpdate={fetchEntries}
          />
        </>
      )}
    </div>
  )
}

function StatPill({ label, value, className }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${className}`}>
      <span className="opacity-80">{label}</span>
      <span className="text-lg font-extrabold">{value}</span>
    </div>
  )
}
