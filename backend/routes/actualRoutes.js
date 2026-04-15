// actualRoutes.js — serves real journey recordings from /backend/data/actual/
const express = require("express");
const { readActualJourneys } = require("../utils/actualJourneyStore");

const router = express.Router();

/**
 * GET /api/actual/:routeId
 * Returns all recorded actual journeys for a given routeId, sorted by date.
 */
router.get("/:routeId", async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const journeys = await readActualJourneys(routeId);

    return res.json({ routeId, count: journeys.length, journeys });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    return next(err);
  }
});

module.exports = router;
