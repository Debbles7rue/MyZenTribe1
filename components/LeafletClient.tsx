// components/LeafletClient.tsx
'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngLiteral } from 'leaflet';
import L from 'leaflet';

// Optional: marker icon fix (works with local leaflet assets)
const DefaultIcon = L.icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type PickerProps = {
  center: LatLngLiteral;
  height?: number;
  zoom?: number;
  marker?: LatLngLiteral | null;
  onPick?: (pt: LatLngLiteral) => void;
};

function ClickToPick({ onPick }: { onPick?: (pt: LatLngLiteral) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng);
    },
  });
  return null;
}

export default function LeafletClient({
  center,
  height = 380,
  zoom = 10,
  marker,
  onPick,
}: PickerProps) {
  return (
    <div style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {marker && <Marker position={marker} />}
        <ClickToPick onPick={onPick} />
      </MapContainer>
    </div>
  );
}
