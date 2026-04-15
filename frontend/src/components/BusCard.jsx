// Shows a compact bus summary used in the results context panel.
function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDuration(startTime, endTime) {
  let minutes = toMinutes(endTime) - toMinutes(startTime);
  if (minutes < 0) minutes += 1440;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function BusCard({ bus }) {
  const departure = bus.stops[0]?.scheduledTime ?? "--:--";
  const arrival = bus.stops[bus.stops.length - 1]?.scheduledTime ?? "--:--";

  return (
    <article className="rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)] p-5 transition-all duration-150 ease-out hover:bg-[var(--c-navy3)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Service</p>
          <h3 className="mt-2 truncate text-[15px] font-semibold text-[var(--c-text)]">{bus.name}</h3>
          <p className="mt-1 text-[12px] text-[var(--c-text2)]">{bus.type}</p>
        </div>
        <span className="rounded-full border border-[var(--c-border2)] bg-[var(--c-navy3)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--c-text3)]">
          {bus.stops.length} stops
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Depart</p>
          <p className="mt-1 font-mono text-[15px] text-[var(--c-text)]">{departure}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Arrive</p>
          <p className="mt-1 font-mono text-[15px] text-[var(--c-text)]">{arrival}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Duration</p>
          <p className="mt-1 font-mono text-[15px] text-[var(--c-teal)]">{formatDuration(departure, arrival)}</p>
        </div>
      </div>
    </article>
  );
}
