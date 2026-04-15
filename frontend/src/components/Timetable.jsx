// Displays bus timetable rows with expandable stop-by-stop delay details.
import { Fragment, useCallback, useMemo, useState } from "react";

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function delayBadge(scheduled, actual) {
  const delay = toMinutes(actual) - toMinutes(scheduled);
  return {
    delay,
    label: delay <= 0 ? "On time" : `+${delay} min`,
    className: delay <= 0
      ? "border-[color:rgba(15,207,170,0.28)] bg-[color:rgba(15,207,170,0.08)] text-[var(--c-teal)]"
      : "border-[color:rgba(240,165,0,0.28)] bg-[color:rgba(240,165,0,0.08)] text-[var(--c-amber)]"
  };
}

function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function Timetable({ buses }) {
  const [expandedBus, setExpandedBus] = useState(null);

  const rows = useMemo(
    () =>
      buses.map((bus) => {
        const first = bus.stops[0];
        const last = bus.stops[bus.stops.length - 1];
        const duration = toMinutes(last.actualTime) - toMinutes(first.actualTime);
        return { bus, first, last, duration };
      }),
    [buses]
  );

  const toggleRow = useCallback((busId) => {
    setExpandedBus((current) => (current === busId ? null : busId));
  }, []);

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-[var(--c-navy3)] text-left text-[11px] uppercase tracking-[0.14em] text-[var(--c-text3)]">
          <tr>
            <th className="px-4 py-3">Bus Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Departure</th>
            <th className="px-4 py-3">Arrival</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Stops</th>
          </tr>
          </thead>
          <tbody>
            {rows.map(({ bus, first, last, duration }, index) => (
            <Fragment key={bus.busId}>
              <tr
                onClick={() => toggleRow(bus.busId)}
                className={`cursor-pointer border-t border-[var(--c-border)] transition-all duration-150 ease-out hover:bg-[var(--c-navy4)] ${
                  index % 2 === 0 ? "bg-[color:rgba(12,21,37,0.9)]" : "bg-transparent"
                }`}
              >
                <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{bus.name}</td>
                <td className="px-4 py-3 text-[var(--c-text2)]">{bus.type}</td>
                <td className="px-4 py-3 font-mono text-[var(--c-text2)]">{first.actualTime}</td>
                <td className="px-4 py-3 font-mono text-[var(--c-text2)]">{last.actualTime}</td>
                <td className="px-4 py-3 font-mono text-[var(--c-teal)]">{formatDuration(duration)}</td>
                <td className="px-4 py-3 font-mono text-[var(--c-text2)]">{bus.stops.length}</td>
              </tr>
              {expandedBus === bus.busId && (
                <tr className="border-t border-[var(--c-border)] bg-[var(--c-navy)]">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="grid gap-2">
                      {bus.stops.map((stop) => {
                        const badge = delayBadge(stop.scheduledTime, stop.actualTime);
                        return (
                          <div
                            key={`${bus.busId}-${stop.name}`}
                            className="grid gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-navy3)] px-4 py-3 md:grid-cols-[1.2fr_0.85fr_0.85fr_auto]"
                          >
                            <span className="font-medium text-[var(--c-text)]">{stop.name}</span>
                            <span className="font-mono text-[13px] text-[var(--c-text2)]">{stop.scheduledTime}</span>
                            <span className="font-mono text-[13px] text-[var(--c-teal)]">{stop.actualTime}</span>
                            <span className={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-[11px] font-semibold ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
