"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type Place = { lat: number; lng: number; label?: string };
type Props = {
  value: Place | null;
  onChange: (p: Place | null) => void;
  initialQuery?: string;
  height?: number;
};

// Fix default marker in Next/Leaflet
const markerIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PlacePicker({
  value,
  onChange,
  initialQuery = "",
  height = 380,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const center = useMemo<[number, number]>(() => {
    if (value) return [value.lat, value.lng];
    return [39.5, -98.35]; // USA-ish default
  }, [value]);

  // Nominatim search (no key)
  async function runSearch(q: string) {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=8&q=${encodeURIComponent(
          q
        )}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = (await r.json()) as any[];
      setResults(
        data.map((d) => ({
          display_name: d.display_name,
          lat: d.lat,
          lon: d.lon,
        }))
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // click outside to close suggestions
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setResults([]);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div ref={boxRef} style={{ position: "relative" }}>
        <input
          className="input"
          placeholder="Search a place (address, park, city…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch(query);
          }}
        />
        <button
          className="btn"
          style={{ position: "absolute", right: 6, top: 6 }}
          onClick={() => runSearch(query)}
        >
          Search
        </button>

        {results.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              left: 0,
              right: 0,
              zIndex: 20,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 8,
              maxHeight: 260,
              overflow: "auto",
              boxShadow: "0 6px 24px rgba(0,0,0,.12)",
            }}
          >
            {results.map((r, i) => (
              <button
                key={i}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid #eee",
                }}
                onClick={() => {
                  setResults([]);
                  setQuery(r.display_name);
                  onChange({
                    lat: parseFloat(r.lat),
                    lng: parseFloat(r.lon),
                    label: r.display_name,
                  });
                }}
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          height,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #eee",
        }}
      >
        <MapContainer
          center={center}
          zoom={value ? 13 : 4}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace
            onPick={(lat, lng) =>
              onChange({
                lat,
                lng,
                label:
                  value?.label ||
                  `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              })
            }
          />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={markerIcon}
            />
          )}
        </MapContainer>
      </div>

      {value && (
        <div className="muted" style={{ fontSize: 12 }}>
          <strong>Picked:</strong>{" "}
          {value.label
            ? value.label
            : `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}
        </div>
      )}
    </div>
  );
}
