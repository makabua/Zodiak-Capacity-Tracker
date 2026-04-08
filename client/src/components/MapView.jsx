import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { STATE_COORDS } from '../utils/stateCoords'

// Fix Leaflet's default icon path issues with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const COLORS = {
  open:     { bg: '#3b82f6', border: '#2563eb', shadow: 'rgba(59,130,246,0.4)' },   // blue
  enclosed: { bg: '#f59e0b', border: '#d97706', shadow: 'rgba(245,158,11,0.4)' },   // amber
}

function createMarkerIcon(truckType, isArchived) {
  const c = COLORS[truckType] || COLORS.open
  const opacity = isArchived ? 0.4 : 1
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 26px; height: 26px;
        background: ${c.bg};
        border: 2.5px solid ${c.border};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 6px ${c.shadow};
        opacity: ${opacity};
        position: relative;
      ">
        <div style="
          width: 10px; height: 10px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  })
}

function getEntryCoords(entry) {
  if (entry.latitude != null && entry.longitude != null) {
    return [entry.latitude, entry.longitude]
  }
  // Fallback to state center
  const stateUpper = (entry.state || '').toUpperCase()
  if (STATE_COORDS[stateUpper]) {
    const [lat, lng] = STATE_COORDS[stateUpper]
    // Add small jitter to prevent exact overlaps
    return [lat + (Math.random() - 0.5) * 0.3, lng + (Math.random() - 0.5) * 0.3]
  }
  return null
}

// Auto-fit bounds to markers
function FitBounds({ entries }) {
  const map = useMap()
  const prevCountRef = useRef(0)

  useEffect(() => {
    if (entries.length === 0) {
      map.setView([39.8, -98.5], 3)
      prevCountRef.current = 0
      return
    }

    const coords = entries
      .map(getEntryCoords)
      .filter(Boolean)

    if (coords.length > 0 && entries.length !== prevCountRef.current) {
      const bounds = L.latLngBounds(coords)
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 5 })
    }
    prevCountRef.current = entries.length
  }, [entries, map])

  return null
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

export default function MapView({ entries, onSelect, selectedId }) {
  return (
    <MapContainer
      center={[39.8, -98.5]}
      zoom={3}
      className="w-full h-full rounded-xl"
      style={{ minHeight: '400px' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds entries={entries} />

      {entries.map((entry) => {
        const coords = getEntryCoords(entry)
        if (!coords) return null

        const isSelected = entry.id === selectedId
        const icon = createMarkerIcon(entry.truck_type, entry.status === 'archived')

        return (
          <Marker
            key={entry.id}
            position={coords}
            icon={icon}
            eventHandlers={{
              click: () => onSelect(entry),
            }}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <p className="font-bold text-slate-800 mb-0.5">{entry.company_name}</p>
                <p className="text-xs text-slate-500 mb-1">{entry.carrier_name}</p>
                <p className="text-xs">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    entry.truck_type === 'open'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {entry.trucks_available} {entry.truck_type}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {entry.city}, {entry.state} &middot; Avail {fmt(entry.available_from)}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(entry); }}
                  className="mt-2 w-full text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50 transition"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
