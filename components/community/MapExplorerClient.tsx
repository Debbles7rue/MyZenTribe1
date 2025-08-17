// components/community/MapExplorerClient.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import Link from "next/link";

// Fix Leaflet default marker icons in Next.js (client only)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type MapCommunity = {
  id: string;
  title: string;
  category: string | null;
};

export type MapPin = {
  id: string;
  community_id: string;
  name: string | null;
  lat: number;
  lng: number;
  address: string | null;
  day_of_week: string | null;
  time_local: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
};

export default function MapExplorerClient({
  center,
  pins,
  communitiesById,
  height = 560,
}: {
  center: LatLngExpression;
  pins: MapPin[];
  communitiesById: Record<string, MapCommunity>;
  height?: number;
}) {
  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }}>
      <MapContainer center={center} zoom={4} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((pin) => {
          const comm = communitiesById[pin.community_id];
          return (
            <Marker key={pin.id} position={[pin.lat, pin.lng]}>
              <Popup>
                <div style={{ maxWidth: 260 }}>
                  <div style={{ fontWeight: 600 }}>{pin.name || "Untitled pin"}</div>
                  {comm?.title && (
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      in{" "}
                      <Link className="link" href={`/communities/${comm.id}`}>
                        {comm.title}
                      </Link>
                      {comm?.category ? ` · ${comm.category}` : ""}
                    </div>
                  )}
                  {pin.address && <div style={{ marginTop: 6 }}>{pin.address}</div>}
                  {(pin.day_of_week || pin.time_local) && (
                    <div className="muted" style={{ marginTop: 4 }}>
                      {pin.day_of_week || ""}
                      {pin.day_of_week && pin.time_local ? " · " : ""}
                      {pin.time_local || ""}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {pin.contact_phone && <a className="btn btn-neutral" href={`tel:${pin.contact_phone}`}>Call</a>}
                    {pin.contact_email && <a className="btn btn-neutral" href={`mailto:${pin.contact_email}`}>Email</a>}
                    {pin.website_url && (
                      <a className="btn btn-neutral" href={pin.website_url} target="_blank" rel="noopener noreferrer">
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
