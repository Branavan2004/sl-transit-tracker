// Exposes route creation, timetable retrieval, and overtake computation endpoints.
const express = require("express");
const { calculateOvertakes } = require("../utils/overtakes");
const { readRoute, saveRoute, validateRoutePayload } = require("../utils/routeStore");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const savedRoute = await saveRoute(req.body);
    return res.status(201).json({
      message: "Route saved successfully.",
      data: savedRoute
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ message: "Route storage directory not found." });
    }
    if (error instanceof SyntaxError || /invalid|missing|required|must|malformed/i.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

router.get("/:routeId/timetable", async (req, res, next) => {
  try {
    const route = validateRoutePayload(await readRoute(req.params.routeId));
    return res.json(route);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ message: "Route not found." });
    }
    if (error instanceof SyntaxError) {
      return res.status(500).json({ message: "Malformed route file content." });
    }
    return next(error);
  }
});

router.get("/:routeId/overtakes", async (req, res, next) => {
  try {
    const route = validateRoutePayload(await readRoute(req.params.routeId));
    const overtakes = calculateOvertakes(route.vehicles);
    return res.json({
      routeId: route.routeId,
      overtakes
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ message: "Route not found." });
    }
    if (error instanceof SyntaxError) {
      return res.status(500).json({ message: "Malformed route file content." });
    }
    if (/invalid|must|malformed/i.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

module.exports = router;
