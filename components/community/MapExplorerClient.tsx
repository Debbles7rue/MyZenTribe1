// components/community/MapExplorerClient.tsx
"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";

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

type Props = {
  center: [number, number]; // [lat, lng]
  pins: MapPin[];
  communitiesById: Record<string, MapCommunity>;
  height?: number;
};

/** Fix Leaflet default marker icons when bundling with Next/Netlify. */
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

/** Helper to set the initial view without using the MapContainer `center` prop. */
function SetView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  // setView once on mount (and if deps change)
  map.setView(center, zoom);
  return null;
}

export default function MapExplorerClient({
  center,
  pins,
  communitiesById,
  height = 560,
}: Props) {
  // Filter out pins missing coordinates
  const safePins = pins.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number"
  );

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }}>
      {/* Note: We intentionally omit the `center` prop to avoid type issues across versions */}
      <MapContainer zoom={4} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <SetView center={center} zoom={4} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {safePins.map((pin) => {
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
                    {pin.contact_phone && (
                      <a className="btn btn-neutral" href={`tel:${pin.contact_phone}`}>
                        Call
                      </a>
                    )}
                    {pin.contact_email && (
                      <a className="btn btn-neutral" href={`mailto:${pin.contact_email}`}>
                        Email
                      </a>
                    )}
                    {pin.website_url && (
                      <a
                        className="btn btn-neutral"
                        href={pin.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
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
