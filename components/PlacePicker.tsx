"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, ZoomControl, LayersControl, useMapEvents } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";

// Basic pin (you can swap for a nicer icon if you want)
const pin = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Place = {
  lat: number;
  lng: number;
  label?: string;
};

type Props = {
  /** Optional initial center if you already know a ZIP/city; defaults to US center */
  initialQuery?: string;
  /** Current value (if editing) */
  value?: Place | null;
  /** Called whenever user chooses a place */
  onChange?: (p: Place | null) => void;
  /** Height of the map */
  height?: number;
};

function ClickToSetMarker({ onPick }: { onPick: (p: Place) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

/** Very light geocode using OpenStreetMap's Nominatim (no key).
 *  If you run into rate limits later, we can swap to MapTiler, Mapbox, or Google.
 */
async function geocode(query: string): Promise<Place | null> {
  if (!query.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, {
    headers: {
      // polite hint for some providers; browser will set Referer automatically
      "Accept-Language": "en",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  const item = data[0];
  return {
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    label: item.display_name,
  };
}

export default function PlacePicker({
  initialQuery,
  value,
  onChange,
  height = 360,
}: Props) {
  const [picked, setPicked] = useState<Place | null>(value ?? null);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [searching, setSearching] = useState(false);

  // default to US center if nothing set
  const center: LatLngExpression = useMemo<LatLngExpression>(() => {
    if (picked) return [picked.lat, picked.lng];
    return [39.5, -98.35]; // US-ish
  }, [picked]);

  useEffect(() => {
    setPicked(value ?? null);
  }, [value]);

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await geocode(query);
      if (result) {
        setPicked(result);
        onChange?.(result);
      }
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPicked(p);
        onChange?.(p);
      },
      () => {}
    );
  };

  return (
    <div className="space-y-2">
      {/* Inline search row */}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Search a place or ZIP"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doSearch();
          }}
        />
        <button className="btn btn-brand" onClick={doSearch} disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
        <button className="btn" onClick={useMyLocation}>Locate me</button>
      </div>

      {/* The map */}
      <div style={{ height, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer
          center={center}
          zoom={picked ? 12 : 4}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          scrollWheelZoom={true}
          wheelDebounceTime={20}
          zoomSnap={0.25}
          doubleClickZoom={true}
          keyboard={true}
          inertia={true}
        >
          <ZoomControl position="bottomright" />

          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Streets">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            {/* Satellite layer (Esri) */}
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution='Tiles &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <ClickToSetMarker
            onPick={(p) => {
              setPicked(p);
              onChange?.(p);
            }}
          />

          {picked && (
            <Marker
              position={[picked.lat, picked.lng]}
              icon={pin}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  const p = { lat: ll.lat, lng: ll.lng, label: picked.label };
                  setPicked(p);
                  onChange?.(p);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="text-sm muted">
        {picked
          ? `Picked: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}${
              picked.label ? ` — ${picked.label}` : ""
            }`
          : "Tip: search a city/ZIP or click the map to drop a pin."}
      </div>
    </div>
  );
}
