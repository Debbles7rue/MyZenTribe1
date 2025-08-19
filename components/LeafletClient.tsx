// components/LeafletClient.tsx
"use client";

import React from "react";
import { MapContainer as RLMapContainer, TileLayer as RLTileLayer } from "react-leaflet";
import type { LatLngExpression, LatLngLiteral } from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  center: LatLngLiteral | [number, number];
  zoom?: number;
  height?: number; // px
  children?: React.ReactNode;
};

export default function LeafletClient({ center, zoom = 13, height = 300, children }: Props) {
  // Normalize to what react-leaflet expects
  const centerExpr: LatLngExpression = Array.isArray(center)
    ? (center as [number, number])
    : ([center.lat, center.lng] as [number, number]);

  // Some environments have over-narrowed types; cast components to any to allow standard props
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
        {children}
      </MapC>
    </div>
  );
}
