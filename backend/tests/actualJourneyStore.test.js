const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { readActualJourneys } = require("../utils/actualJourneyStore");

test("readActualJourneys matches journeys by routeId instead of filename prefix", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "actual-journeys-"));

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    path.join(tempDir, "actual-bus-colombo-jaffna-2026-03-12.json"),
    JSON.stringify({
      date: "2026-03-12",
      routeId: "bus-colombo-jaffna-2026-04-16",
      vehicleId: "RATHNA_TRAVELS_MORNING_1",
      stops: [],
    })
  );

  await fs.writeFile(
    path.join(tempDir, "actual-bus-colombo-jaffna-2026-04-14.json"),
    JSON.stringify({
      date: "2026-04-14",
      routeId: "bus-colombo-jaffna-2026-04-16",
      vehicleId: "RATHNA_TRAVELS_MORNING_2",
      stops: [],
    })
  );

  await fs.writeFile(
    path.join(tempDir, "actual-bus-colombo-kandy-2026-04-14.json"),
    JSON.stringify({
      date: "2026-04-14",
      routeId: "bus-colombo-kandy-2026-04-16",
      vehicleId: "OTHER_BUS",
      stops: [],
    })
  );

  const journeys = await readActualJourneys("bus-colombo-jaffna-2026-04-16", tempDir);

  assert.equal(journeys.length, 2);
  assert.equal(journeys[0].date, "2026-03-12");
  assert.equal(journeys[1].date, "2026-04-14");
});

test("readActualJourneys returns an empty list when the actual-data directory is missing", async () => {
  const missingDir = path.join(os.tmpdir(), `missing-actual-${Date.now()}`);
  const journeys = await readActualJourneys("bus-colombo-jaffna-2026-04-16", missingDir);

  assert.deepEqual(journeys, []);
});

test("readActualJourneys rejects invalid route ids", async () => {
  await assert.rejects(
    () => readActualJourneys("../bus-colombo-jaffna"),
    /Invalid routeId format/
  );
});
