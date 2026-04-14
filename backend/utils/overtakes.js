// Calculates pairwise overtakes from timetable-only stop times.
function parseTimeToMinutes(time) {
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const [hours, minutes] = time.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value: ${time}`);
  }

  return hours * 60 + minutes;
}

function interpolateKm(startStop, endStop, ratio) {
  if (typeof startStop.km !== "number" || typeof endStop.km !== "number") {
    return null;
  }

  const interpolated = startStop.km + ratio * (endStop.km - startStop.km);
  return Number(interpolated.toFixed(2));
}

function toAbsoluteTimeline(stops) {
  const absolute = [];
  let dayOffset = 0;
  let previous = null;

  stops.forEach((stop) => {
    const current = parseTimeToMinutes(stop.scheduledTime);
    if (previous !== null && current < previous) {
      dayOffset += 24 * 60;
    }
    absolute.push(current + dayOffset);
    previous = current;
  });

  return absolute;
}

function calculateOvertakes(vehicles) {
  if (!Array.isArray(vehicles)) {
    throw new Error("Vehicles must be an array.");
  }

  const overtakes = [];

  for (let i = 0; i < vehicles.length; i += 1) {
    for (let j = i + 1; j < vehicles.length; j += 1) {
      const vehicleA = vehicles[i];
      const vehicleB = vehicles[j];

      if (!Array.isArray(vehicleA.stops) || !Array.isArray(vehicleB.stops)) {
        throw new Error("Each vehicle must contain a stops array.");
      }

      const vehicleATimeline = toAbsoluteTimeline(vehicleA.stops);
      const vehicleBTimeline = toAbsoluteTimeline(vehicleB.stops);
      const segmentCount = Math.min(vehicleA.stops.length, vehicleB.stops.length) - 1;

      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const aStart = vehicleATimeline[segmentIndex];
        const aEnd = vehicleATimeline[segmentIndex + 1];
        const bStart = vehicleBTimeline[segmentIndex];
        const bEnd = vehicleBTimeline[segmentIndex + 1];

        const aAheadAtStart = aStart < bStart;
        const bAheadAtStart = bStart < aStart;
        const aAheadAtEnd = aEnd < bEnd;
        const bAheadAtEnd = bEnd < aEnd;

        if ((aAheadAtStart && bAheadAtEnd) || (bAheadAtStart && aAheadAtEnd)) {
          const deltaStart = aStart - bStart;
          const deltaEnd = aEnd - bEnd;
          const ratio = Math.abs(deltaStart) / (Math.abs(deltaStart) + Math.abs(deltaEnd));
          const estimatedKm = interpolateKm(
            vehicleA.stops[segmentIndex],
            vehicleA.stops[segmentIndex + 1],
            ratio
          );

          overtakes.push({
            vehicleA: vehicleA.vehicleId,
            vehicleB: vehicleB.vehicleId,
            overtakingVehicle: aAheadAtStart ? vehicleB.vehicleId : vehicleA.vehicleId,
            betweenStops: [
              vehicleA.stops[segmentIndex].name,
              vehicleA.stops[segmentIndex + 1].name
            ],
            estimatedKm
          });
        }
      }
    }
  }

  return overtakes;
}

module.exports = {
  calculateOvertakes,
  parseTimeToMinutes,
  toAbsoluteTimeline
};
