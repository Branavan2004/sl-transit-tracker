// Provides route listing and route-level bus lookup endpoints.
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const routes = require("../data/routes.json");
const buses = require("../data/buses.json");

const router = express.Router();
const IMPORTED_ROUTE_FILE = path.join(
  __dirname,
  "../data/routes/bus-colombo-jaffna-2026-04-16.json"
);

router.get("/", (_req, res) => {
  return res.json(routes);
});

router.get("/:id/buses", async (req, res) => {
  const { id } = req.params;
  if (!/^[a-z0-9_]+$/.test(id)) {
    return res.status(400).json({ message: "Invalid route id format." });
  }

  const selectedRoute = routes.find((route) => route.routeId === id);
  if (!selectedRoute) {
    return res.status(404).json({ message: "Route not found." });
  }

  let routeBuses = buses.filter((bus) => bus.routeId === id);

  // For Colombo -> Jaffna, include all imported vehicles from the full route file
  // so the legacy endpoint can serve complete data instead of only demo entries.
  if (id === "route_colombo_jaffna") {
    try {
      const raw = await fs.readFile(IMPORTED_ROUTE_FILE, "utf8");
      const routeFile = JSON.parse(raw);
      const imported = (routeFile.vehicles || []).map((vehicle) => ({
        busId: vehicle.vehicleId,
        name: vehicle.vehicleId.replace(/_/g, " "),
        type: "Intercity",
        route: "Colombo - Jaffna",
        routeId: id,
        stops: (vehicle.stops || []).map((stop) => ({
          name: stop.name,
          km: stop.km,
          scheduledTime: stop.scheduledTime,
          actualTime: stop.scheduledTime,
        })),
      }));

      // Keep imported data as source of truth for full route, but fall back to
      // legacy sample data if import is empty/unavailable.
      if (imported.length > 0) {
        routeBuses = imported;
      }
    } catch (_err) {
      // Silent fallback to existing static buses.json data.
    }
  }

  return res.json(routeBuses);
});

module.exports = router;
