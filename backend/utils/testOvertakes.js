// Quick smoke test: run calculateOvertakes against the Jaffna route.
const fs = require("fs");
const path = require("path");
const { calculateOvertakes } = require("./overtakeCalculator");

const routeFile = path.join(__dirname, "../data/routes/bus-colombo-jaffna-2026-04-16.json");
const route = JSON.parse(fs.readFileSync(routeFile, "utf8"));

console.log(`Route: ${route.routeId}`);
console.log(`Vehicles: ${route.vehicles.length}`);

const overtakes = calculateOvertakes(route.vehicles);
console.log(`\nTotal overtakes found: ${overtakes.length}`);
console.log("\nSample (first 10):");
overtakes.slice(0, 10).forEach((e) => {
  console.log(
    `  ${e.overtakingVehicle.padEnd(35)} overtakes at km ${String(e.atKm).padEnd(6)} between [${e.betweenStops.join(" → ")}]`
  );
});
