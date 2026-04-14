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
    className: delay <= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
  };
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
    <div className="overflow-hidden rounded-xl bg-white shadow-md">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left text-slate-700">
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
          {rows.map(({ bus, first, last, duration }) => (
            <Fragment key={bus.busId}>
              <tr onClick={() => toggleRow(bus.busId)} className="cursor-pointer border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{bus.name}</td>
                <td className="px-4 py-3">{bus.type}</td>
                <td className="px-4 py-3">{first.actualTime}</td>
                <td className="px-4 py-3">{last.actualTime}</td>
                <td className="px-4 py-3">{duration} min</td>
                <td className="px-4 py-3">{bus.stops.length}</td>
              </tr>
              {expandedBus === bus.busId && (
                <tr className="border-t bg-slate-50">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="grid gap-2">
                      {bus.stops.map((stop) => {
                        const badge = delayBadge(stop.scheduledTime, stop.actualTime);
                        return (
                          <div key={`${bus.busId}-${stop.name}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                            <span className="font-medium">{stop.name}</span>
                            <span className="text-slate-600">
                              {stop.scheduledTime} / {stop.actualTime}
                            </span>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
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
  );
}
