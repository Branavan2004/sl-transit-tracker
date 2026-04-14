// Verifies pure overtake calculation behavior and invalid-time handling.
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateOvertakes, toAbsoluteTimeline } = require("../utils/overtakes");

test("calculateOvertakes returns all crossing segments with estimatedKm null", () => {
  const vehicles = [
    {
      vehicleId: "X",
      stops: [
        { name: "Colombo Fort", scheduledTime: "07:00" },
        { name: "Kadawatha", scheduledTime: "07:30" },
        { name: "Ambepussa", scheduledTime: "08:15" },
        { name: "Kandy", scheduledTime: "09:30" }
      ]
    },
    {
      vehicleId: "Y",
      stops: [
        { name: "Colombo Fort", scheduledTime: "07:10" },
        { name: "Kadawatha", scheduledTime: "07:35" },
        { name: "Ambepussa", scheduledTime: "08:10" },
        { name: "Kandy", scheduledTime: "09:45" }
      ]
    }
  ];

  const overtakes = calculateOvertakes(vehicles);

  assert.equal(overtakes.length, 2);
  assert.deepEqual(overtakes[0], {
    vehicleA: "X",
    vehicleB: "Y",
    overtakingVehicle: "Y",
    betweenStops: ["Kadawatha", "Ambepussa"],
    estimatedKm: null
  });
  assert.deepEqual(overtakes[1], {
    vehicleA: "X",
    vehicleB: "Y",
    overtakingVehicle: "X",
    betweenStops: ["Ambepussa", "Kandy"],
    estimatedKm: null
  });
});

test("calculateOvertakes throws on malformed time values", () => {
  const vehicles = [
    {
      vehicleId: "A",
      stops: [
        { name: "Stop 1", scheduledTime: "07:00" },
        { name: "Stop 2", scheduledTime: "08:99" }
      ]
    },
    {
      vehicleId: "B",
      stops: [
        { name: "Stop 1", scheduledTime: "07:05" },
        { name: "Stop 2", scheduledTime: "08:10" }
      ]
    }
  ];

  assert.throws(() => calculateOvertakes(vehicles), /Invalid time value/);
});

test("toAbsoluteTimeline carries times across midnight", () => {
  const timeline = toAbsoluteTimeline([
    { name: "Colombo Fort", scheduledTime: "22:00" },
    { name: "Puttalam", scheduledTime: "23:30" },
    { name: "Anuradhapura", scheduledTime: "00:50" },
    { name: "Jaffna", scheduledTime: "04:10" }
  ]);

  assert.deepEqual(timeline, [1320, 1410, 1490, 1690]);
});
