import { api } from '../utils/api'

const STATUS_BADGE = {
  new:       'bg-emerald-100 text-emerald-700',
  contacted: 'bg-blue-100 text-blue-700',
  archived:  'bg-slate-200 text-slate-500',
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

export default function DetailPanel({ entry, onClose, onUpdate }) {
  if (!entry) return null

  const isArchived = entry.status === 'archived'

  async function updateStatus(status) {
    await api.patch(`/submissions/${entry.id}/status`, { status })
    onUpdate()
  }

  async function handleDelete() {
    if (!confirm(`Delete submission from ${entry.company_name}? This cannot be undone.`)) return
    await api.delete(`/submissions/${entry.id}`)
    onClose()
    onUpdate()
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-2xl z-[1000] flex flex-col border-l border-slate-200 animate-slide-in">
      {/* Header */}
      <div className={`px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 ${
        entry.truck_type === 'open' ? 'bg-blue-50' : 'bg-amber-50'
      }`}>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg text-slate-800 truncate">{entry.company_name}</h2>
          <p className="text-sm text-slate-500">{entry.carrier_name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1 rounded-lg hover:bg-white/80 transition flex-shrink-0"
          title="Close"
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[entry.status]}`}>
            {entry.status}
          </span>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-2 gap-4">
          {entry.phone && (
            <Detail label="Phone">
              <a href={`tel:${entry.phone}`} className="text-sm text-blue-700 hover:underline">{entry.phone}</a>
            </Detail>
          )}
          {entry.email && (
            <Detail label="Email">
              <a href={`mailto:${entry.email}`} className="text-sm text-blue-700 hover:underline break-all">{entry.email}</a>
            </Detail>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Truck Type">
            <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_BADGE[entry.truck_type]}`}>
              {entry.truck_type}
            </span>
          </Detail>
          <Detail label="Trucks Available">
            <span className="text-lg font-bold text-slate-800">{entry.trucks_available}</span>
          </Detail>
          <Detail label="Location">
            <span className="text-sm text-slate-700">{entry.city}, {entry.state}</span>
          </Detail>
          <Detail label="Available From">
            <span className="text-sm text-slate-700">{fmt(entry.available_from)}</span>
          </Detail>
        </div>

        {/* Notes */}
        {entry.notes && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Notes</p>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
              {entry.notes}
            </p>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Submitted {new Date(entry.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 flex-wrap">
        {entry.status !== 'contacted' && !isArchived && (
          <ActionBtn
            onClick={() => updateStatus('contacted')}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Mark Contacted
          </ActionBtn>
        )}
        {entry.status === 'contacted' && (
          <ActionBtn
            onClick={() => updateStatus('new')}
            className="bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Reopen
          </ActionBtn>
        )}
        {!isArchived ? (
          <ActionBtn
            onClick={() => updateStatus('archived')}
            className="bg-slate-200 text-slate-600 hover:bg-slate-300"
          >
            Archive
          </ActionBtn>
        ) : (
          <ActionBtn
            onClick={() => updateStatus('new')}
            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          >
            Restore
          </ActionBtn>
        )}
        <button
          onClick={handleDelete}
          className="ml-auto text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition border border-transparent hover:border-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}

function ActionBtn({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-semibold px-4 py-2 rounded-lg transition ${className}`}
    >
      {children}
    </button>
  )
}
