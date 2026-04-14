// Provides route listing and route-level bus lookup endpoints.
const express = require("express");
const routes = require("../data/routes.json");
const buses = require("../data/buses.json");

const router = express.Router();

router.get("/", (_req, res) => {
  return res.json(routes);
});

router.get("/:id/buses", (req, res) => {
  const { id } = req.params;
  if (!/^[a-z0-9_]+$/.test(id)) {
    return res.status(400).json({ message: "Invalid route id format." });
  }

  const selectedRoute = routes.find((route) => route.routeId === id);
  if (!selectedRoute) {
    return res.status(404).json({ message: "Route not found." });
  }

  const routeBuses = buses.filter((bus) => bus.routeId === id);
  return res.json(routeBuses);
});

module.exports = router;
