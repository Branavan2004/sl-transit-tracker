// ActualJourneyTable.jsx — Scheduled vs Actual stop comparison table
import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function parseToMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function varianceMinutes(scheduledTime, actualTime) {
  const s = parseToMinutes(scheduledTime);
  const a = parseToMinutes(actualTime);
  if (s === null || a === null) return null;
  // Handle midnight crossover: if actual is much less than scheduled, add 1440
  let diff = a - s;
  if (diff < -720) diff += 1440;
  if (diff > 720) diff -= 1440;
  return diff;
}

function formatVariance(minutes) {
  if (minutes === null) {
    return {
      label: "Scheduled only",
      className: "border-[color:rgba(74,96,125,0.3)] bg-[color:rgba(74,96,125,0.15)] text-[var(--c-text3)]",
    };
  }

  if (minutes <= 0) {
    return {
      label: minutes === 0 ? "On time" : `▲ ${Math.abs(minutes)}m`,
      className: "text-[var(--c-teal)]",
    };
  }

  if (minutes <= 15) {
    return {
      label: `▼ ${minutes}m`,
      className: "text-[var(--c-amber)]",
    };
  }

  return {
    label: `▼ ${minutes}m`,
    className: "text-[#e24b4a]",
  };
}

function JourneyPanel({ journey }) {
  const rows = useMemo(() => {
    return journey.stops.map((stop) => ({
      name: stop.name,
      scheduled: stop.scheduledTime,
      actual: stop.actualTime || null,
      variance: varianceMinutes(stop.scheduledTime, stop.actualTime),
    }));
  }, [journey.stops]);

  const totalVariance = useMemo(() => {
    const last = rows[rows.length - 1];
    return last.variance;
  }, [rows]);

  const finalVariance = formatVariance(totalVariance);

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c-border)] bg-[var(--c-navy3)] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Recorded journey</p>
          <p className="font-semibold text-[var(--c-text)]">
            {journey.vehicleId.replace(/_/g, " ")}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--c-text2)]">{journey.date}</p>
        </div>
        {totalVariance !== null && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Final variance</p>
            <p className={`mt-1 font-mono text-[14px] font-medium ${finalVariance.className}`}>{finalVariance.label}</p>
          </div>
        )}
      </div>

      {journey.notes && (
        <div className="border-b border-[var(--c-border)] bg-[color:rgba(7,12,24,0.5)] px-4 py-2">
          <p className="text-[12px] italic text-[var(--c-text2)]">{journey.notes}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)] bg-[var(--c-navy3)] text-[11px] uppercase tracking-[0.14em] text-[var(--c-text3)]">
              <th className="px-4 py-2 text-left">Stop</th>
              <th className="px-4 py-2 text-center">Scheduled</th>
              <th className="px-4 py-2 text-center">Actual</th>
              <th className="px-4 py-2 text-center">Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.name}-${i}`}
                className="border-b border-[var(--c-border)] transition-colors duration-150 ease-out hover:bg-[var(--c-navy4)]"
              >
                <td className={`px-4 py-3 font-medium text-[var(--c-text)] ${row.actual ? "border-l-2 border-[var(--c-teal)] pl-3" : ""}`}>
                  {row.name}
                </td>
                <td className="px-4 py-3 text-center font-mono text-[13px] text-[var(--c-text2)]">{row.scheduled}</td>
                <td className="px-4 py-3 text-center">
                  {row.actual ? (
                    <span className="font-mono text-[13px] text-[var(--c-teal)]">{row.actual}</span>
                  ) : (
                    <span className="inline-flex rounded-md border border-[color:rgba(74,96,125,0.3)] bg-[color:rgba(74,96,125,0.15)] px-2 py-1 text-[10px] text-[var(--c-text3)]">
                      Scheduled only
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-mono text-[13px] ${formatVariance(row.variance).className}`}>
                    {formatVariance(row.variance).label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {journey.overtakesObserved?.length > 0 && (
        <div className="border-t border-[var(--c-border)] bg-[color:rgba(7,12,24,0.35)] px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-text3)]">
            Overtakes observed
          </p>
          <div className="space-y-1">
            {journey.overtakesObserved.map((ov, i) => (
              <p key={i} className="text-[12px] text-[var(--c-text2)]">
                <span className="text-[var(--c-amber)]">Observed:</span> overtook{" "}
                <span className="text-[var(--c-text)]">{ov.overtookVehicle}</span> near{" "}
                <span className="text-[var(--c-text)]">{ov.nearStop}</span> at{" "}
                <span className="font-mono text-[var(--c-teal)]">{ov.atTime}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ActualJourneyTable({ routeId }) {
  const [journeys, setJourneys] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | empty | error

  useEffect(() => {
    if (!routeId) { setStatus("empty"); return; }
    fetch(`${API_BASE}/api/actual/${routeId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load actual journey data.");
        }
        return response.json();
      })
      .then((data) => {
        setJourneys(data.journeys || []);
        setStatus(data.journeys?.length > 0 ? "ok" : "empty");
      })
      .catch(() => setStatus("error"));
  }, [routeId]);

  if (status === "loading") {
    return (
      <div className="flex h-24 animate-pulse items-center justify-center rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)]">
        <p className="text-sm text-[var(--c-text3)]">Loading actual journey data…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-[18px] border border-[color:rgba(226,75,74,0.28)] bg-[color:rgba(176,29,73,0.12)] px-4 py-3 text-sm text-[#f09c9c]">
        Failed to load actual journey data.
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="flex items-center gap-3 rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)] px-4 py-3">
        <span className="rounded-md border border-[color:rgba(74,96,125,0.3)] bg-[color:rgba(74,96,125,0.15)] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--c-text3)]">
          Scheduled only
        </span>
        <p className="text-sm text-[var(--c-text2)]">
          No real journey recordings for this route yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Actual journey data</p>
          <h2 className="mt-1 text-[18px] font-semibold text-[var(--c-text)]">Scheduled vs Actual</h2>
        </div>
        <span className="rounded-full border border-[color:rgba(15,207,170,0.25)] bg-[color:rgba(15,207,170,0.08)] px-3 py-1 text-[11px] font-medium text-[var(--c-teal)]">
          {journeys.length} recorded {journeys.length === 1 ? "trip" : "trips"}
        </span>
      </div>
      {journeys.map((j, i) => (
        <JourneyPanel key={`${j.vehicleId}-${j.date}-${i}`} journey={j} />
      ))}
    </div>
  );
}
