// Loads route-specific buses and renders timetable plus overtake simulator views.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BusCard from "../components/BusCard";
import OvertakeChart from "../components/OvertakeChart";
import Timetable from "../components/Timetable";
import { useBuses } from "../hooks/useBuses";

export default function Results() {
  const [searchParams] = useSearchParams();
  const [buses, setBuses] = useState([]);
  const { fetchBusesByRoute, loading, error } = useBuses();

  const from = searchParams.get("from") || "Colombo";
  const to = searchParams.get("to") || "Jaffna";

  useEffect(() => {
    let isMounted = true;
    fetchBusesByRoute("route_colombo_jaffna")
      .then((data) => {
        if (isMounted) setBuses(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [fetchBusesByRoute]);

  const headerText = useMemo(() => `${from} -> ${to}`, [from, to]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between rounded-xl bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs uppercase text-slate-500">Search Result</p>
            <h1 className="text-2xl font-bold">{headerText}</h1>
          </div>
          <Link to="/" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">
            New Search
          </Link>
        </div>

        {loading && <p className="rounded-xl bg-white p-4 text-sm shadow-sm">Loading buses...</p>}
        {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 shadow-sm">{error}</p>}

        {buses.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {buses.map((bus) => (
                <BusCard key={bus.busId} bus={bus} />
              ))}
            </div>
            <Timetable buses={buses} />
            <OvertakeChart buses={buses} />
          </>
        )}
      </section>
    </main>
  );
}
