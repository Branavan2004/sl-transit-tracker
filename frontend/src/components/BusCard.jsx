// Shows a compact bus summary used in the results context panel.
export default function BusCard({ bus }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{bus.name}</h3>
      <p className="text-sm text-slate-600">{bus.type}</p>
      <p className="mt-1 text-sm text-slate-500">
        {bus.stops[0].scheduledTime} {"->"} {bus.stops[bus.stops.length - 1].scheduledTime}
      </p>
    </article>
  );
}
