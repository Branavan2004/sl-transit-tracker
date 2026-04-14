// Loads route-specific buses and renders timetable plus overtake simulator views.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BusCard from "../components/BusCard";
import OvertakeChart from "../components/OvertakeChart";
import Skeleton from "../components/Skeleton";
import Timetable from "../components/Timetable";
import { useBuses } from "../hooks/useBuses";

export default function Results() {
  const [searchParams] = useSearchParams();
  const [buses, setBuses] = useState([]);
  const [simulatorLoading, setSimulatorLoading] = useState(true);
  const { fetchBusesByRoute, loading, error } = useBuses();

  const from = searchParams.get("from") || "Colombo";
  const to = searchParams.get("to") || "Jaffna";

  useEffect(() => {
    let isMounted = true;
    setSimulatorLoading(true);
    fetchBusesByRoute("route_colombo_jaffna")
      .then((data) => {
        if (isMounted) setBuses(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [fetchBusesByRoute]);

  useEffect(() => {
    if (buses.length === 0) {
      setSimulatorLoading(true);
      return undefined;
    }

    // Delay chart mount briefly so users see a polished simulator loading state.
    const timer = setTimeout(() => setSimulatorLoading(false), 700);
    return () => clearTimeout(timer);
  }, [buses]);

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

        {loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={`card-skeleton-${index}`} className="rounded-xl bg-white p-4 shadow-sm">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/3" />
                <Skeleton className="mt-4 h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}
        {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 shadow-sm">{error}</p>}

        {buses.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {buses.map((bus) => (
                <BusCard key={bus.busId} bus={bus} />
              ))}
            </div>
            <Timetable buses={buses} />
            {simulatorLoading ? (
              <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-xl bg-white p-4 shadow-md">
                  <Skeleton className="mb-4 h-8 w-72" />
                  <Skeleton className="mb-4 h-6 w-full" />
                  <Skeleton className="h-[420px] w-full" />
                </div>
                <aside className="rounded-xl bg-white p-4 shadow-md">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-4 h-16 w-full" />
                  <Skeleton className="mt-3 h-16 w-full" />
                </aside>
              </section>
            ) : (
              <OvertakeChart buses={buses} />
            )}
          </>
        )}
      </section>
    </main>
  );
}
