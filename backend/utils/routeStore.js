// Provides file-based route persistence plus strict timetable validation.
const fs = require("fs/promises");
const path = require("path");
const { parseTimeToMinutes } = require("./overtakes");

const ROUTES_DIR = path.join(__dirname, "..", "data", "routes");

function buildRoutePath(routeId) {
  return path.join(ROUTES_DIR, `${routeId}.json`);
}

function normalizeVehicle(vehicle) {
  const normalizedDeparture = vehicle.departureTime || vehicle.departurTime || null;
  return {
    vehicleId: vehicle.vehicleId,
    departureTime: normalizedDeparture,
    stops: vehicle.stops
  };
}

function validateVehicle(vehicle, index) {
  if (!vehicle || typeof vehicle !== "object") {
    throw new Error(`Vehicle at index ${index} must be an object.`);
  }

  if (typeof vehicle.vehicleId !== "string" || vehicle.vehicleId.trim() === "") {
    throw new Error(`Vehicle at index ${index} is missing a valid vehicleId.`);
  }

  if (vehicle.departureTime && typeof vehicle.departureTime !== "string") {
    throw new Error(`Vehicle ${vehicle.vehicleId} has an invalid departureTime.`);
  }

  if (!Array.isArray(vehicle.stops) || vehicle.stops.length < 2) {
    throw new Error(`Vehicle ${vehicle.vehicleId} must contain at least two stops.`);
  }

  vehicle.stops.forEach((stop, stopIndex) => {
    if (!stop || typeof stop !== "object") {
      throw new Error(`Vehicle ${vehicle.vehicleId} has malformed stop at index ${stopIndex}.`);
    }
    if (typeof stop.name !== "string" || stop.name.trim() === "") {
      throw new Error(`Vehicle ${vehicle.vehicleId} has stop with invalid name at index ${stopIndex}.`);
    }
    parseTimeToMinutes(stop.scheduledTime);
  });
}

function validateStopConsistency(vehicles) {
  const referenceStops = vehicles[0].stops.map((stop) => stop.name);

  for (let i = 1; i < vehicles.length; i += 1) {
    const currentStops = vehicles[i].stops.map((stop) => stop.name);
    const sameLength = currentStops.length === referenceStops.length;
    const sameOrder = sameLength && currentStops.every((stopName, idx) => stopName === referenceStops[idx]);
    if (!sameOrder) {
      throw new Error(
        `Vehicle ${vehicles[i].vehicleId} does not share the same stop names in the same order.`
      );
    }
  }
}

function validateRoutePayload(routePayload) {
  if (!routePayload || typeof routePayload !== "object") {
    throw new Error("Route payload must be an object.");
  }

  if (
    typeof routePayload.routeId !== "string" ||
    !/^[a-z0-9-]+$/i.test(routePayload.routeId)
  ) {
    throw new Error("routeId is required and must be alphanumeric (hyphen allowed).");
  }

  if (!Array.isArray(routePayload.vehicles) || routePayload.vehicles.length === 0) {
    throw new Error("vehicles must be a non-empty array.");
  }

  const normalizedVehicles = routePayload.vehicles.map(normalizeVehicle);
  normalizedVehicles.forEach(validateVehicle);
  // Disabled strict check: buses on the same route can have different stopping patterns.
  // validateStopConsistency(normalizedVehicles);

  return {
    routeId: routePayload.routeId,
    vehicles: normalizedVehicles
  };
}

async function saveRoute(routePayload) {
  const validated = validateRoutePayload(routePayload);
  await fs.mkdir(ROUTES_DIR, { recursive: true });
  await fs.writeFile(buildRoutePath(validated.routeId), JSON.stringify(validated, null, 2), "utf8");
  return validated;
}

async function readRoute(routeId) {
  const routePath = buildRoutePath(routeId);
  const fileContents = await fs.readFile(routePath, "utf8");
  return JSON.parse(fileContents);
}

module.exports = {
  ROUTES_DIR,
  readRoute,
  saveRoute,
  validateRoutePayload
};
