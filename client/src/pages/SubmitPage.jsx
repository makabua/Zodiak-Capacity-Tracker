import { useState } from 'react'
import { api } from '../utils/api'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

const INITIAL = {
  carrier_name: '',
  company_name: '',
  phone: '',
  email: '',
  trucks_available: '',
  truck_type: 'open',
  city: '',
  state: '',
  available_from: '',
  rate_per_mile: '',
  notes: '',
}

export default function SubmitPage() {
  const [form, setForm] = useState(INITIAL)
  const [status, setStatus] = useState(null) // null | 'submitting' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await api.post('/submissions', form)
      if (res?.error) {
        setErrorMsg(res.error)
        setStatus('error')
      } else {
        setStatus('success')
        setForm(INITIAL)
      }
    } catch {
      setErrorMsg('Network error — please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex flex-col">
      {/* Header */}
      <header className="py-8 text-center">
        <p className="text-blue-300 text-sm font-semibold uppercase tracking-widest mb-1">Powered by</p>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Zodiak<span className="text-blue-300"> TLS</span>
        </h1>
        <p className="mt-2 text-blue-200 text-base">Carrier Capacity Submission</p>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <h2 className="text-xl font-bold text-slate-800">Submit Available Capacity</h2>
            <p className="text-sm text-slate-500 mt-1">
              Fill out the form below and our team will be in touch.
            </p>
          </div>

          {status === 'success' ? (
            <div className="px-8 py-10 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Submission Received!</h3>
              <p className="text-slate-500 mt-2">Thanks — the Zodiak team will reach out shortly.</p>
              <button
                onClick={() => setStatus(null)}
                className="mt-6 px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition"
              >
                Submit Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              {/* Row: Carrier Name + Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Your Name" required>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={form.carrier_name}
                    onChange={(e) => set('carrier_name', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Carrier / Company" required>
                  <input
                    type="text"
                    placeholder="Smith Trucking LLC"
                    value={form.company_name}
                    onChange={(e) => set('company_name', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Row: Phone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone Number" required>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    placeholder="john@smithtrucking.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Row: Trucks + Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Trucks Available" required>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    placeholder="3"
                    value={form.trucks_available}
                    onChange={(e) => set('trucks_available', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Truck Type" required>
                  <div className="flex gap-3 mt-1">
                    {['open', 'enclosed'].map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="truck_type"
                          value={t}
                          checked={form.truck_type === t}
                          onChange={() => set('truck_type', t)}
                          className="accent-blue-700"
                        />
                        <span className="text-sm font-medium text-slate-700 capitalize">{t}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>

              {/* Row: City + State */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Current City" required>
                  <input
                    type="text"
                    placeholder="Dallas"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="State" required>
                  <select
                    value={form.state}
                    onChange={(e) => set('state', e.target.value)}
                    required
                    className={inputCls}
                  >
                    <option value="">— Select —</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Available From + Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Available From" required>
                  <input
                    type="date"
                    value={form.available_from}
                    onChange={(e) => set('available_from', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Target Rate ($/mile)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="2.50"
                      value={form.rate_per_mile}
                      onChange={(e) => set('rate_per_mile', e.target.value)}
                      className={inputCls + ' pl-6'}
                    />
                  </div>
                </Field>
              </div>

              {/* Notes */}
              <Field label="Notes">
                <textarea
                  rows={3}
                  placeholder="Lane preferences, contact info, equipment details…"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className={inputCls + ' resize-none'}
                />
              </Field>

              {status === 'error' && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-3 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800 active:scale-95 transition disabled:opacity-60"
              >
                {status === 'submitting' ? 'Submitting…' : 'Submit Capacity'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
