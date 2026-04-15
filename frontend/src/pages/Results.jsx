// Loads route-specific buses and renders timetable plus overtake simulator views.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BusCard from "../components/BusCard";
import CommandCenterNav from "../components/CommandCenterNav";
import Skeleton from "../components/Skeleton";
import Timetable from "../components/Timetable";
import ActualJourneyTable from "../components/ActualJourneyTable";
import { useBuses } from "../hooks/useBuses";

const ROUTE_ID = "bus-colombo-jaffna-2026-04-16";

export default function Results() {
  const [searchParams] = useSearchParams();
  const [buses, setBuses] = useState([]);
  const { fetchBusesByRoute, loading, error } = useBuses();

  const from = searchParams.get("from") || "Colombo";
  const to = searchParams.get("to") || "Jaffna";
  const routeLabel = useMemo(() => `${from} → ${to}`, [from, to]);
  const timetableHref = useMemo(() => {
    const params = new URLSearchParams({ from, to });
    return `/results?${params.toString()}`;
  }, [from, to]);

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

  return (
    <main className="min-h-screen bg-[var(--c-navy)]">
      <CommandCenterNav activeTab="timetable" routeLabel={routeLabel} timetableHref={timetableHref} />

      <section className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="fade-up rounded-[24px] border border-[var(--c-border)] bg-[radial-gradient(circle_at_top_right,rgba(176,29,73,0.12),transparent_28%),var(--c-navy2)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--c-text3)]">Timetable board</p>
              <h1 className="mt-3 text-[28px] font-semibold text-[var(--c-text)]">{routeLabel}</h1>
              <p className="mt-2 max-w-3xl text-[14px] leading-7 text-[var(--c-text2)]">
                Review scheduled departures, compare actual journey recordings, and jump into the simulator or live map using the command-centre tabs.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/"
                className="rounded-xl border border-[var(--c-border2)] px-4 py-3 text-[13px] font-semibold text-[var(--c-text2)] transition-all duration-150 ease-out hover:bg-[var(--c-navy4)]"
              >
                New Search
              </Link>
              <Link
                to="/simulate"
                className="rounded-xl bg-[var(--c-red)] px-4 py-3 text-[13px] font-semibold text-white transition-all duration-150 ease-out hover:bg-[var(--c-red2)]"
              >
                Overtake Simulator
              </Link>
              <Link
                to="/simulate?tab=map"
                className="rounded-xl border border-[color:rgba(15,207,170,0.28)] bg-[color:rgba(15,207,170,0.08)] px-4 py-3 text-[13px] font-semibold text-[var(--c-teal)] transition-all duration-150 ease-out hover:bg-[color:rgba(15,207,170,0.14)]"
              >
                Live Map
              </Link>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-6 grid gap-4 min-[900px]:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={`card-skeleton-${index}`} className="rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)] p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/3" />
                <Skeleton className="mt-4 h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}
        {error && (
          <p className="mt-6 rounded-[18px] border border-[color:rgba(226,75,74,0.25)] bg-[color:rgba(176,29,73,0.12)] p-4 text-sm text-[#f1b1b1]">
            {error}
          </p>
        )}

        {buses.length > 0 && (
          <>
            <div className="fade-up fade-delay-1 mt-6 grid gap-4 min-[900px]:grid-cols-3">
              {buses.map((bus) => (
                <BusCard key={bus.busId} bus={bus} />
              ))}
            </div>

            <div className="fade-up fade-delay-2 mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Scheduled services</p>
                  <h2 className="mt-1 text-[20px] font-semibold text-[var(--c-text)]">Timetable</h2>
                </div>
                <span className="rounded-full border border-[var(--c-border2)] bg-[var(--c-navy3)] px-3 py-1 text-[11px] font-medium text-[var(--c-text2)]">
                  {buses.length} services loaded
                </span>
              </div>
              <Timetable buses={buses} />
            </div>

            <div className="fade-up fade-delay-3 mt-6">
              <ActualJourneyTable routeId={ROUTE_ID} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
