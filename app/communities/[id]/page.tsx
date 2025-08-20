// components/community/MapExplorerClient.tsx
"use client";

import React, { useMemo } from "react";
import {
  MapContainer as RLMapContainer,
  TileLayer as RLTileLayer,
  Marker,
  Popup,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  id: string;
  name?: string | null;
  lat: number | null;
  lng: number | null;
  address?: string | null;
  website_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  categories?: string[] | null;
  // keep these optional to match callers; strings here to avoid TS mismatches
  day_of_week?: string | null;
  time_local?: string | null;
  community_id?: string | null;
};

export type MapCommunity = {
  id: string;
  title: string;
  category: string | null;
};

type Props = {
  center: [number, number];
  pins: MapPin[];
  communitiesById: Record<string, MapCommunity>;
  height?: number; // px
  zoom?: number;
};

export default function MapExplorerClient({
  center,
  pins,
  communitiesById,
  height = 340,
  zoom = 4,
}: Props) {
  // Normalize to what react-leaflet expects
  const centerExpr: LatLngExpression = useMemo<[number, number]>(() => center, [center]);

  // Some environments have over-narrowed types; cast components to any to allow standard props
  const MapC: any = RLMapContainer as any;
  const TileLayer: any = RLTileLayer as any;

  const validPins = useMemo(
    () => pins.filter((p) => typeof p.lat === "number" && typeof p.lng === "number") as Required<Pick<MapPin, "lat" | "lng">> & MapPin[],
    [pins]
  );

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden" }}>
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

        {validPins.map((p) => {
          const pos: [number, number] = [p.lat as number, p.lng as number];
          const community = p.community_id ? communitiesById[p.community_id] : undefined;
          return (
            <Marker key={p.id} position={pos}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {p.name || "Untitled"}
                  </div>
                  {community && (
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      {community.title}
                      {community.category ? ` · ${community.category}` : ""}
                    </div>
                  )}
                  {p.address && (
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      {p.address}
                    </div>
                  )}
                  {p.categories && p.categories.length > 0 && (
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      {p.categories.join(", ")}
                    </div>
                  )}
                  {p.website_url && (
                    <a
                      className="btn"
                      href={p.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-block", marginTop: 6 }}
                    >
                      Open website
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapC>
    </div>
  );
}
