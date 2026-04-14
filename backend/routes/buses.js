// Handles bus-specific API endpoints and encapsulates data loading logic.
const express = require("express");
const buses = require("../data/buses.json");

const router = express.Router();

router.get("/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^[A-Z0-9_]+$/.test(id)) {
      return res.status(400).json({ message: "Invalid bus id format." });
    }

    const bus = buses.find((item) => item.busId === id);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found." });
    }

    return res.json(bus);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
