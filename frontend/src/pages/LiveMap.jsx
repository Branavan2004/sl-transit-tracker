import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { labelFor, minutesToHHmm, useSimulator } from "../context/SimulatorContext";
import { HIGHWAY_STOPS, ROUTE_LATLNGS, getBusPosition, kmToLatLng } from "../utils/simulatorMap";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = "© OpenStreetMap contributors © CartoDB";

function createBusIcon(color) {
  return L.divIcon({
    className: "bus-marker-icon",
    html: `<span class="bus-marker-icon__dot" style="--marker-color:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapInvalidator({ isActive }) {
  const map = useMap();

  useEffect(() => {
    if (!isActive) return undefined;
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [isActive, map]);

  return null;
}

function AnimatedFlashCircle({ event }) {
  const [opacity, setOpacity] = useState(0.5);

  useEffect(() => {
    let frameId = null;
    const startTime = performance.now();
    const duration = 1500;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      setOpacity(0.5 * (1 - progress));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  if (opacity <= 0.01) return null;

  return (
    <Circle
      center={kmToLatLng(event.atKm)}
      radius={600}
      pathOptions={{
        color: "#f0a500",
        fillColor: "#f0a500",
        opacity,
        fillOpacity: opacity * 0.6,
        weight: 2,
      }}
    />
  );
}

function OvertakeFlash({ overtakes, timelineMinutes, isActive }) {
  const [flashes, setFlashes] = useState([]);
  const previousTimeRef = useRef(timelineMinutes);
  const recentFlashRef = useRef(new Map());

  useEffect(() => {
    if (!isActive) {
      previousTimeRef.current = timelineMinutes;
      return undefined;
    }

    const lowerBound = Math.min(previousTimeRef.current, timelineMinutes) - 0.5;
    const upperBound = Math.max(previousTimeRef.current, timelineMinutes) + 0.5;
    const now = Date.now();

    const nextFlashes = overtakes.filter((event) => {
      if (event.atTimeMinutes < lowerBound || event.atTimeMinutes > upperBound) {
        return false;
      }

      const flashKey = `${event.vehicleA}-${event.vehicleB}-${event.atKm}-${event.atTimeMinutes}`;
      const lastFlash = recentFlashRef.current.get(flashKey) ?? 0;

      if (now - lastFlash < 1200) {
        return false;
      }

      recentFlashRef.current.set(flashKey, now);
      return true;
    });

    if (nextFlashes.length > 0) {
      const tagged = nextFlashes.map((event) => ({ ...event, flashId: `${Date.now()}-${Math.random()}` }));
      setFlashes((current) => [...current, ...tagged]);

      const timer = setTimeout(() => {
        setFlashes((current) => current.filter((flash) => !tagged.some((item) => item.flashId === flash.flashId)));
      }, 1500);

      previousTimeRef.current = timelineMinutes;
      return () => clearTimeout(timer);
    }

    previousTimeRef.current = timelineMinutes;
    return undefined;
  }, [isActive, overtakes, timelineMinutes]);

  return (
    <>
      {flashes.map((event) => (
        <AnimatedFlashCircle key={event.flashId} event={event} />
      ))}
    </>
  );
}

export default function LiveMap({ isActive = true }) {
  const { vehicles, visibleOvertakes, timelineMinutes, selectedIds, colorMap } = useSimulator();

  const positions = useMemo(() => {
    return vehicles
      .filter((vehicle) => selectedIds.has(vehicle.vehicleId))
      .map((vehicle) => {
        const position = getBusPosition(vehicle, timelineMinutes);
        if (!position) return null;

        return {
          vehicleId: vehicle.vehicleId,
          latlng: [position.lat, position.lng],
          currentStop: position.currentStop,
          nextStop: position.nextStop,
          etaMinutes: position.etaMinutes,
          km: position.km,
          icon: createBusIcon(colorMap[vehicle.vehicleId]),
        };
      })
      .filter(Boolean);
  }, [colorMap, selectedIds, timelineMinutes, vehicles]);

  return (
    <div className="h-full overflow-hidden rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)]">
      <div style={{ width: "100%", height: "100%" }} className="relative h-full w-full overflow-hidden">
        <MapContainer
          center={[8.5, 80.5]}
          zoom={8}
          style={{ width: "100%", height: "100%" }}
          zoomControl
          scrollWheelZoom
        >
          <MapInvalidator isActive={isActive} />

          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

          <Polyline positions={ROUTE_LATLNGS} pathOptions={{ color: "#8D153A", weight: 8, opacity: 0.15 }} />
          <Polyline positions={ROUTE_LATLNGS} pathOptions={{ color: "#cc2255", weight: 2, dashArray: "10 6", opacity: 0.9 }} />

          {HIGHWAY_STOPS.map((stop) => (
            <CircleMarker
              key={stop.name}
              center={[stop.lat, stop.lng]}
              radius={4}
              pathOptions={{ color: "#8D153A", fillColor: "#8D153A", fillOpacity: 0.45, weight: 1 }}
            >
              <Tooltip className="route-tooltip" direction="top" offset={[0, -4]}>
                <div className="px-3 py-2">
                  <p className="text-[12px] font-semibold text-[var(--c-text)]">{stop.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--c-text2)]">{stop.km} km</p>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

          {positions.map((position) => (
            <Marker key={position.vehicleId} position={position.latlng} icon={position.icon}>
              <Tooltip className="bus-tooltip" direction="top" offset={[0, -12]}>
                <div className="px-3 py-2">
                  <p className="text-[13px] font-semibold text-[var(--c-text)]">{labelFor(position.vehicleId)}</p>
                  <p className="mt-1 text-[11px] text-[var(--c-text2)]">
                    {position.currentStop} → {position.nextStop}
                  </p>
                  <p className="mt-2 font-mono text-[12px] text-[var(--c-teal)]">
                    ETA {Math.floor(position.etaMinutes / 60)}h {position.etaMinutes % 60}m
                  </p>
                </div>
              </Tooltip>
            </Marker>
          ))}

          <OvertakeFlash overtakes={visibleOvertakes} timelineMinutes={timelineMinutes} isActive={isActive} />
        </MapContainer>

        <div className="pointer-events-none absolute bottom-6 left-6 rounded-[10px] border border-[var(--c-border2)] bg-[color:rgba(7,12,24,0.85)] px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Live map status</p>
          <div className="mt-3 flex flex-col gap-1">
            <p className="font-mono text-[12px] text-[var(--c-text2)]">{positions.length} buses on road</p>
            <p className="font-mono text-[12px] text-[var(--c-teal)]">{minutesToHHmm(timelineMinutes)}</p>
            <p className="font-mono text-[12px] text-[var(--c-text2)]">{visibleOvertakes.length} overtakes so far</p>
          </div>
        </div>
      </div>
    </div>
  );
}
