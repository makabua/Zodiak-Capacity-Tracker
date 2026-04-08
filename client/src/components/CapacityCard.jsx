import { api } from '../utils/api'

const STATUS_BADGE = {
  new:       'bg-emerald-100 text-emerald-700',
  contacted: 'bg-blue-100 text-blue-700',
  archived:  'bg-slate-100 text-slate-500',
}

const TYPE_BORDER = {
  open:     'border-l-blue-500',
  enclosed: 'border-l-amber-500',
}

const TYPE_BADGE = {
  open:     'bg-blue-100 text-blue-700',
  enclosed: 'bg-amber-100 text-amber-700',
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function CapacityCard({ entry, onUpdate }) {
  const isArchived = entry.status === 'archived'

  async function updateStatus(status) {
    await api.patch(`/submissions/${entry.id}/status`, { status })
    onUpdate()
  }

  async function handleDelete() {
    if (!confirm(`Delete submission from ${entry.company_name}? This cannot be undone.`)) return
    await api.delete(`/submissions/${entry.id}`)
    onUpdate()
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${TYPE_BORDER[entry.truck_type]} overflow-hidden flex flex-col transition hover:shadow-md ${isArchived ? 'opacity-60' : ''}`}
    >
      {/* Top */}
      <div className="px-5 pt-4 pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-bold text-slate-800 leading-tight">{entry.company_name}</h3>
            <p className="text-xs text-slate-500">{entry.carrier_name}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[entry.status]}`}>
            {entry.status}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-2 mt-3 mb-3">
          <Chip className={TYPE_BADGE[entry.truck_type]}>
            {entry.trucks_available} {entry.truck_type}
          </Chip>
          <Chip className="bg-slate-100 text-slate-600">
            📍 {entry.city}, {entry.state}
          </Chip>
          <Chip className="bg-slate-100 text-slate-600">
            📅 {fmt(entry.available_from)}
          </Chip>
        </div>

        {entry.notes && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mt-1">{entry.notes}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-2">
          {entry.status !== 'contacted' && !isArchived && (
            <ActionBtn
              onClick={() => updateStatus('contacted')}
              className="text-blue-700 hover:bg-blue-50"
            >
              Mark Contacted
            </ActionBtn>
          )}
          {entry.status === 'contacted' && (
            <ActionBtn
              onClick={() => updateStatus('new')}
              className="text-slate-600 hover:bg-slate-100"
            >
              Reopen
            </ActionBtn>
          )}
          {!isArchived ? (
            <ActionBtn
              onClick={() => updateStatus('archived')}
              className="text-slate-500 hover:bg-slate-100"
            >
              Archive
            </ActionBtn>
          ) : (
            <ActionBtn
              onClick={() => updateStatus('new')}
              className="text-emerald-700 hover:bg-emerald-50"
            >
              Restore
            </ActionBtn>
          )}
          <button
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
            title="Delete permanently"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

function Chip({ children, className }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${className}`}>
      {children}
    </span>
  )
}

function ActionBtn({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${className}`}
    >
      {children}
    </button>
  )
}
