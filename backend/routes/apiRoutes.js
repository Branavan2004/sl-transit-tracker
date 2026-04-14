// Exposes route creation, timetable retrieval, and overtake computation endpoints.
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { calculateOvertakes } = require("../utils/overtakeCalculator");
const { readRoute, saveRoute, validateRoutePayload } = require("../utils/routeStore");

const ROUTES_DIR = path.join(__dirname, "../data/routes");


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
    const routeFile = path.join(ROUTES_DIR, `${req.params.routeId}.json`);
    const raw = await fs.readFile(routeFile, "utf8");
    const route = JSON.parse(raw);
    const overtakes = calculateOvertakes(route.vehicles);
    return res.json({
      routeId: route.routeId,
      count: overtakes.length,
      overtakes
    });
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


module.exports = router;
