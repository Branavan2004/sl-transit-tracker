import { toAbsoluteMinutes } from "../context/SimulatorContext";

export const HIGHWAY_STOPS = [
  { name: "Colombo Fort", km: 0, lat: 6.9344, lng: 79.8428 },
  { name: "Negombo", km: 38, lat: 7.2084, lng: 79.8358 },
  { name: "Puttalam", km: 120, lat: 8.0362, lng: 79.8283 },
  { name: "Anuradhapura", km: 205, lat: 8.3114, lng: 80.4037 },
  { name: "Medawachchiya", km: 228, lat: 8.5107, lng: 80.4936 },
  { name: "Vavuniya", km: 261, lat: 8.7514, lng: 80.4971 },
  { name: "Kilinochchi", km: 333, lat: 9.3803, lng: 80.377 },
  { name: "Jaffna", km: 396, lat: 9.6615, lng: 80.0255 },
];

export const ROUTE_LATLNGS = HIGHWAY_STOPS.map((stop) => [stop.lat, stop.lng]);

export function kmToLatLng(km) {
  if (km <= HIGHWAY_STOPS[0].km) {
    return [HIGHWAY_STOPS[0].lat, HIGHWAY_STOPS[0].lng];
  }

  if (km >= HIGHWAY_STOPS[HIGHWAY_STOPS.length - 1].km) {
    return [
      HIGHWAY_STOPS[HIGHWAY_STOPS.length - 1].lat,
      HIGHWAY_STOPS[HIGHWAY_STOPS.length - 1].lng,
    ];
  }

  for (let index = 0; index < HIGHWAY_STOPS.length - 1; index += 1) {
    const current = HIGHWAY_STOPS[index];
    const next = HIGHWAY_STOPS[index + 1];

    if (km >= current.km && km <= next.km) {
      const ratio = (km - current.km) / (next.km - current.km);
      return [
        current.lat + ratio * (next.lat - current.lat),
        current.lng + ratio * (next.lng - current.lng),
      ];
    }
  }

  return [HIGHWAY_STOPS[0].lat, HIGHWAY_STOPS[0].lng];
}

export function getBusPosition(vehicle, timeMinutes) {
  const absoluteMinutes = toAbsoluteMinutes(vehicle.stops, vehicle.departureTime);

  if (timeMinutes < absoluteMinutes[0] || timeMinutes > absoluteMinutes[absoluteMinutes.length - 1]) {
    return null;
  }

  for (let index = 0; index < absoluteMinutes.length - 1; index += 1) {
    const start = absoluteMinutes[index];
    const end = absoluteMinutes[index + 1];

    if (start <= timeMinutes && timeMinutes <= end) {
      const ratio = end === start ? 0 : (timeMinutes - start) / (end - start);
      const km = vehicle.stops[index].km + ratio * (vehicle.stops[index + 1].km - vehicle.stops[index].km);
      const [lat, lng] = kmToLatLng(km);

      return {
        lat,
        lng,
        km,
        currentStop: vehicle.stops[index].name,
        nextStop: vehicle.stops[index + 1].name,
        etaMinutes: Math.max(0, Math.round(absoluteMinutes[absoluteMinutes.length - 1] - timeMinutes)),
      };
    }
  }

  return null;
}

export function countVisibleBusesOnRoad(vehicles, selectedIds, timeMinutes) {
  return vehicles.reduce((count, vehicle) => {
    if (selectedIds && !selectedIds.has(vehicle.vehicleId)) {
      return count;
    }

    return getBusPosition(vehicle, timeMinutes) ? count + 1 : count;
  }, 0);
}
