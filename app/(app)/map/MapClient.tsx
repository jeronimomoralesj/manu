'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapLocation } from '@/types'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const ACCENT_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:34px;position:relative;
  ">
    <svg viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 20 14 20s14-10.667 14-20C28 6.268 21.732 0 14 0z" fill="#FF5722"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  </div>`,
  iconSize: [28, 34],
  iconAnchor: [14, 34],
  popupAnchor: [0, -36],
})

const ACTIVE_ICON = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:44px;">
    <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;filter:drop-shadow(0 4px 8px rgba(255,87,34,0.5))">
      <path d="M18 0C8.059 0 0 8.059 0 18c0 12 18 26 18 26S36 30 36 18C36 8.059 27.941 0 18 0z" fill="#FF5722"/>
      <circle cx="18" cy="18" r="7" fill="white"/>
    </svg>
  </div>`,
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -46],
})

function FlyToActive({ loc }: { loc: MapLocation | null }) {
  const map = useMap()
  useEffect(() => {
    if (loc) {
      map.flyTo([loc.latitude, loc.longitude], 7, { duration: 1.2 })
    }
  }, [loc, map])
  return null
}

interface Props {
  locations: MapLocation[]
  active: MapLocation | null
  onSelect: (loc: MapLocation) => void
}

export default function MapClient({ locations, active, onSelect }: Props) {
  const center: [number, number] = locations.length > 0
    ? [locations[0].latitude, locations[0].longitude]
    : [4.711, -74.0721]

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ width: '100%', height: '100%', borderRadius: '24px' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToActive loc={active} />
      {locations.map(loc => (
        <Marker
          key={loc.id}
          position={[loc.latitude, loc.longitude]}
          icon={active?.id === loc.id ? ACTIVE_ICON : ACCENT_ICON}
          eventHandlers={{ click: () => onSelect(loc) }}
        >
          <Popup>
            <strong>{loc.trip_title}</strong><br />
            <span style={{ color: '#FF5722' }}>{loc.city_name}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
