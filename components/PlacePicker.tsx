// components/PlacePicker.tsx
"use client";

import React, { useMemo } from "react";
import {
  MapContainer as RLMapContainer,
  TileLayer as RLTileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

type Props = {
  /** Current value (marker position). */
  value?: LatLng | null;
  /** Called when user clicks on the map. */
  onChange?: (coords: LatLng) => void;
  /** Map height in px. */
  height?: number;
  /** Zoom used when value is set. */
  zoomWhenSet?: number;
  /** Allow unknown props to pass through without TS errors in call sites. */
  [key: string]: any;
};

function ClickCapture({ onPick }: { onPick?: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function PlacePicker({
  value,
  onChange,
  height = 260,
  zoomWhenSet = 13,
}: Props) {
  // Compute a safe center; fall back to continental US
  const centerTuple = useMemo<[number, number]>(() => {
    if (value && typeof value.lat === "number" && typeof value.lng === "number") {
      return [value.lat, value.lng];
    }
    return [39.5, -98.35];
  }, [value]);

  const zoom = value ? zoomWhenSet : 4;

  // Normalize to what react-leaflet expects
  const centerExpr: LatLngExpression = centerTuple;

  // Relax types to avoid over-narrowed prop definitions in some envs
  const MapC: any = RLMapContainer as any;
  const TileLayer: any = RLTileLayer as any;

  return (
    <div style={{ height }}>
      <MapC
        center={centerExpr}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <ClickCapture onPick={onChange} />
        {value && <Marker position={centerExpr as [number, number]} />}
      </MapC>
    </div>
  );
}
