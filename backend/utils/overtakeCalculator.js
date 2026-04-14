// overtakeCalculator.js
// Pure function for detecting pairwise vehicle overtakes using km-based interpolation.
// Handles midnight crossover: times that wrap past 00:00 are adjusted by +1440 minutes.

/**
 * Parse "HH:mm" string to minutes since midnight.
 */
function parseTimeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convert a vehicle's stops to absolute minutes, fixing midnight crossovers.
 * If a stop's raw minutes are less than the departure time (in minutes),
 * it belongs to the next calendar day, so we add 1440.
 */
function toAbsoluteMinutes(stops, departureTime) {
  const depMinutes = parseTimeToMinutes(departureTime);
  return stops.map((stop) => {
    let t = parseTimeToMinutes(stop.scheduledTime);
    if (t < depMinutes) {
      t += 1440;
    }
    return t;
  });
}

/**
 * Given two vehicles (each with monotonically increasing km stops),
 * find all km points where one overtakes the other.
 *
 * @param {Object} vA - vehicle A with .vehicleId, .departureTime, .stops
 * @param {Object} vB - vehicle B with .vehicleId, .departureTime, .stops
 * @returns {Array} overtake events for this pair
 */
function findOvertakesBetween(vA, vB) {
  const stopsA = vA.stops;
  const stopsB = vB.stops;

  const timesA = toAbsoluteMinutes(stopsA, vA.departureTime);
  const timesB = toAbsoluteMinutes(stopsB, vB.departureTime);

  // Build (km, time) normalized arrays
  const pointsA = stopsA.map((s, i) => ({ km: s.km, t: timesA[i], name: s.name }));
  const pointsB = stopsB.map((s, i) => ({ km: s.km, t: timesB[i], name: s.name }));

  // Find the overlapping km range between both vehicles
  const minKm = Math.max(pointsA[0].km, pointsB[0].km);
  const maxKm = Math.min(pointsA[pointsA.length - 1].km, pointsB[pointsB.length - 1].km);

  if (minKm >= maxKm) return []; // No overlapping corridor

  /**
   * Linearly interpolate the time at a given km on one vehicle's path.
   */
  function interpolateTime(points, km) {
    // Find the surrounding segment
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].km <= km && km <= points[i + 1].km) {
        const span = points[i + 1].km - points[i].km;
        if (span === 0) return points[i].t;
        const ratio = (km - points[i].km) / span;
        return points[i].t + ratio * (points[i + 1].t - points[i].t);
      }
    }
    return null;
  }

  /**
   * Find the nearest named stops on vehicle A's route that straddle a given km.
   */
  function betweenStopsAt(km) {
    for (let i = 0; i < stopsA.length - 1; i++) {
      if (stopsA[i].km <= km && km <= stopsA[i + 1].km) {
        return [stopsA[i].name, stopsA[i + 1].name];
      }
    }
    return ["Unknown", "Unknown"];
  }

  const events = [];

  // Sample every KM_STEP km across the shared corridor
  const KM_STEP = 1;
  let prevDiff = null;
  let prevKm = null;

  for (let km = minKm; km <= maxKm; km += KM_STEP) {
    const tA = interpolateTime(pointsA, km);
    const tB = interpolateTime(pointsB, km);
    if (tA === null || tB === null) continue;

    const diff = tA - tB; // positive = A is behind B (B arrived earlier), negative = A is ahead

    if (prevDiff !== null && diff * prevDiff < 0) {
      // Sign changed — an overtake occurred between prevKm and km
      const ratio = Math.abs(prevDiff) / (Math.abs(prevDiff) + Math.abs(diff));
      const atKm = Number((prevKm + ratio * (km - prevKm)).toFixed(1));
      const atTime = interpolateTime(pointsA, atKm);

      // prevDiff > 0: A was behind, now A is ahead → A overtook B (A arrived at this km sooner)
      const overtakingVehicle = prevDiff > 0 ? vA.vehicleId : vB.vehicleId;

      events.push({
        vehicleA: vA.vehicleId,
        vehicleB: vB.vehicleId,
        overtakingVehicle,
        atKm,
        atTimeMinutes: atTime !== null ? Math.round(atTime) : null,
        betweenStops: betweenStopsAt(atKm)
      });
    }

    prevDiff = diff;
    prevKm = km;
  }

  return events;
}

/**
 * Calculate all overtakes across a fleet of vehicles.
 *
 * @param {Array} vehicles - array of vehicle objects with .vehicleId, .departureTime, .stops
 * @returns {Array} sorted overtake events
 */
function calculateOvertakes(vehicles) {
  if (!Array.isArray(vehicles)) throw new Error("vehicles must be an array.");

  const events = [];

  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const vA = vehicles[i];
      const vB = vehicles[j];

      // Both must have valid stops with km data
      if (!Array.isArray(vA.stops) || vA.stops.length < 2) continue;
      if (!Array.isArray(vB.stops) || vB.stops.length < 2) continue;
      if (typeof vA.stops[0].km !== "number" || typeof vB.stops[0].km !== "number") continue;

      const pairEvents = findOvertakesBetween(vA, vB);
      events.push(...pairEvents);
    }
  }

  return events.sort((a, b) => a.atKm - b.atKm);
}

module.exports = { calculateOvertakes, parseTimeToMinutes, toAbsoluteMinutes };
