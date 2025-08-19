// components/LeafletClient.tsx
"use client";

import React from "react";
import { MapContainer as RLMapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression, LatLngLiteral } from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  center: LatLngLiteral | [number, number];
  zoom?: number;
  height?: number; // px
  children?: React.ReactNode;
};

export default function LeafletClient({ center, zoom = 13, height = 300, children }: Props) {
  // Normalize center to LatLngExpression for react-leaflet
  const centerExpr: LatLngExpression = Array.isArray(center)
    ? (center as [number, number])
    : ([center.lat, center.lng] as [number, number]);

  // Cast to any to avoid over-strict MapContainerProps mismatch in TS
  const MapC: any = RLMapContainer as any;

  return (
    <div style={{ height }}>
      <MapC
        center={centerExpr}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapC>
    </div>
  );
}
