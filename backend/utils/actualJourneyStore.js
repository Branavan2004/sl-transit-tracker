const fs = require("fs/promises");
const path = require("path");

const DEFAULT_ACTUAL_DIR = path.join(__dirname, "../data/actual");

function validateRouteId(routeId) {
  if (!/^[a-z0-9-]+$/i.test(routeId)) {
    const error = new Error("Invalid routeId format.");
    error.statusCode = 400;
    throw error;
  }
}

function isActualJourneyFile(filename) {
  return filename.startsWith("actual-") && filename.endsWith(".json");
}

async function readActualJourneys(routeId, actualDir = DEFAULT_ACTUAL_DIR) {
  validateRouteId(routeId);

  let files;
  try {
    files = await fs.readdir(actualDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const journeys = [];

  for (const filename of files.filter(isActualJourneyFile)) {
    const raw = await fs.readFile(path.join(actualDir, filename), "utf8");
    const journey = JSON.parse(raw);

    if (journey?.routeId === routeId) {
      journeys.push(journey);
    }
  }

  journeys.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return journeys;
}

module.exports = {
  DEFAULT_ACTUAL_DIR,
  isActualJourneyFile,
  readActualJourneys,
};
