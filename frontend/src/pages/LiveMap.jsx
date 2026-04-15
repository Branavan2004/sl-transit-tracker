// LiveMap.jsx — Leaflet map showing bus positions synced to the timeline
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useSimulator, toAbsoluteMinutes, minutesToHHmm, labelFor } from "../context/SimulatorContext";

// ─── Route corridor (A9/A3 highway) ──────────────────────────────────────────
const MAIN_STOPS = [
  { name: "Colombo Fort",    km: 0,   lat: 6.9344, lng: 79.8428 },
  { name: "Negombo",         km: 35,  lat: 7.2084, lng: 79.8358 },
  { name: "Puttalam",        km: 130, lat: 8.0362, lng: 79.8283 },
  { name: "Anuradhapura",    km: 205, lat: 8.3114, lng: 80.4037 },
  { name: "Medawachchiya",   km: 235, lat: 8.5107, lng: 80.4936 },
  { name: "Vavuniya",        km: 265, lat: 8.7514, lng: 80.4971 },
  { name: "Kilinochchi",     km: 335, lat: 9.3803, lng: 80.3770 },
  { name: "Jaffna",          km: 400, lat: 9.6615, lng: 80.0255 },
];

const ROUTE_LATLNGS = MAIN_STOPS.map((s) => [s.lat, s.lng]);

// ─── Interpolate lat/lng at a given km along the corridor ────────────────────
function kmToLatLng(km) {
  if (km <= MAIN_STOPS[0].km) return [MAIN_STOPS[0].lat, MAIN_STOPS[0].lng];
  if (km >= MAIN_STOPS[MAIN_STOPS.length - 1].km)
    return [MAIN_STOPS[MAIN_STOPS.length - 1].lat, MAIN_STOPS[MAIN_STOPS.length - 1].lng];

  for (let i = 0; i < MAIN_STOPS.length - 1; i++) {
    const s1 = MAIN_STOPS[i], s2 = MAIN_STOPS[i + 1];
    if (km >= s1.km && km <= s2.km) {
      const ratio = (km - s1.km) / (s2.km - s1.km);
      return [s1.lat + ratio * (s2.lat - s1.lat), s1.lng + ratio * (s2.lng - s1.lng)];
    }
  }
  return [MAIN_STOPS[0].lat, MAIN_STOPS[0].lng];
}

// ─── Compute a vehicle's current km at a given absolute time ─────────────────
function vehicleKmAt(vehicle, absoluteTimeMinutes) {
  const abs = toAbsoluteMinutes(vehicle.stops, vehicle.departureTime);
  // Before departure
  if (absoluteTimeMinutes < abs[0]) return null;
  // After arrival
  if (absoluteTimeMinutes > abs[abs.length - 1]) return null;

  for (let i = 0; i < abs.length - 1; i++) {
    if (abs[i] <= absoluteTimeMinutes && absoluteTimeMinutes <= abs[i + 1]) {
      const span = abs[i + 1] - abs[i];
      if (span === 0) return vehicle.stops[i].km;
      const ratio = (absoluteTimeMinutes - abs[i]) / span;
      return vehicle.stops[i].km + ratio * (vehicle.stops[i + 1].km - vehicle.stops[i].km);
    }
  }
  return null;
}

// ─── "ETA to Jaffna" from current position ───────────────────────────────────
function etaToJaffna(vehicle, absoluteTimeMinutes) {
  const abs = toAbsoluteMinutes(vehicle.stops, vehicle.departureTime);
  const lastStops = vehicle.stops[vehicle.stops.length - 1];
  const lastTime = abs[abs.length - 1];
  if (absoluteTimeMinutes >= lastTime) return "Arrived";
  const remaining = lastTime - absoluteTimeMinutes;
  const h = Math.floor(remaining / 60), m = Math.round(remaining % 60);
  return `${h}h ${m}m`;
}

// ─── Flash: overtake burst on map ─────────────────────────────────────────────
function OvertakeFlash({ overtakes, timelineMinutes }) {
  const [flashes, setFlashes] = useState([]);
  const prevTime = useRef(timelineMinutes);

  useEffect(() => {
    // Find newly crossed overtakes
    const newFlashes = overtakes.filter(
      (e) => e.atTimeMinutes > prevTime.current && e.atTimeMinutes <= timelineMinutes
    );
    if (newFlashes.length > 0) {
      const id = Date.now();
      setFlashes((f) => [...f, ...newFlashes.map((e) => ({ ...e, id: id + Math.random() }))]);
      setTimeout(() => setFlashes((f) => f.filter((x) => x.id !== id)), 1500);
    }
    prevTime.current = timelineMinutes;
  }, [timelineMinutes, overtakes]);

  return (
    <>
      {flashes.map((ev) => {
        const pos = kmToLatLng(ev.atKm);
        return (
          <CircleMarker
            key={ev.id}
            center={pos}
            radius={18}
            pathOptions={{ color: "#f97316", fillColor: "#fed7aa", fillOpacity: 0.55, weight: 2 }}
          >
            <Tooltip permanent={false} sticky>
              ⚡ {labelFor(ev.overtakingVehicle)} overtook {labelFor(ev.vehicleA === ev.overtakingVehicle ? ev.vehicleB : ev.vehicleA)}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ─── Auto-pan to keep markers in view ────────────────────────────────────────
function MapSync({ positions }) {
  // No-op: we don't auto-pan, user controls the map freely
  return null;
}

// ─── Main Map Component ───────────────────────────────────────────────────────
export default function LiveMap() {
  const { vehicles, visibleOvertakes, timelineMinutes, selectedIds, colorMap } = useSimulator();

  const visibleVehicles = useMemo(
    () => vehicles.filter((v) => selectedIds.has(v.vehicleId)),
    [vehicles, selectedIds]
  );

  // Compute each vehicle's current position
  const positions = useMemo(() => {
    return visibleVehicles.map((v) => {
      const km = vehicleKmAt(v, timelineMinutes);
      if (km === null) return null;
      const latlng = kmToLatLng(km);
      const eta = etaToJaffna(v, timelineMinutes);
      return { vehicleId: v.vehicleId, km: km.toFixed(1), latlng, eta };
    }).filter(Boolean);
  }, [visibleVehicles, timelineMinutes]);

  return (
    <div className="rounded-2xl bg-slate-900 p-3 shadow-xl overflow-hidden">
      {/* Map legend row */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-red-500" />
          A9/A3 Highway
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-orange-400" />
          Overtake flash
        </span>
        <span className="ml-auto font-mono text-slate-300">
          {positions.length} buses on road · {minutesToHHmm(timelineMinutes)}
        </span>
      </div>

      {/* Leaflet map */}
      <div className="h-[540px] rounded-xl overflow-hidden ring-1 ring-slate-700">
        <MapContainer
          center={[8.0, 80.3]}
          zoom={7}
          style={{ height: "100%", width: "100%", background: "#0f172a" }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-tiles-dark"
          />

          {/* Highway corridor */}
          <Polyline
            positions={ROUTE_LATLNGS}
            pathOptions={{ color: "#ef4444", weight: 3, dashArray: "8 5", opacity: 0.7 }}
          />

          {/* Main stop markers */}
          {MAIN_STOPS.map((stop) => (
            <CircleMarker
              key={stop.name}
              center={[stop.lat, stop.lng]}
              radius={4}
              pathOptions={{ color: "#ef4444", fillColor: "#fee2e2", fillOpacity: 1, weight: 2 }}
            >
              <Tooltip sticky>
                <span className="text-xs font-semibold">{stop.name}</span>
                <br />
                <span className="text-xs text-gray-500">{stop.km} km</span>
              </Tooltip>
            </CircleMarker>
          ))}

          {/* Bus position markers */}
          {positions.map((pos) => (
            <CircleMarker
              key={pos.vehicleId}
              center={pos.latlng}
              radius={7}
              pathOptions={{
                color: "#0f172a",
                fillColor: colorMap[pos.vehicleId],
                fillOpacity: 0.95,
                weight: 1.5,
              }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <p className="font-semibold">{labelFor(pos.vehicleId)}</p>
                  <p className="text-gray-500">📍 {pos.km} km from Colombo</p>
                  <p className="text-gray-500">⏱ ETA to end: {pos.eta}</p>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

          {/* Overtake flash animations */}
          <OvertakeFlash overtakes={visibleOvertakes} timelineMinutes={timelineMinutes} />

          <MapSync positions={positions} />
        </MapContainer>
      </div>
    </div>
  );
}
