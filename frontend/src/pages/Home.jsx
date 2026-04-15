// Presents project hero content and route search inputs.
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterNav from "../components/CommandCenterNav";
import SearchBar from "../components/SearchBar";

export default function Home() {
  const navigate = useNavigate();

  const handleSearch = useCallback(
    ({ from, to }) => {
      const params = new URLSearchParams({ from, to });
      navigate(`/results?${params.toString()}`);
    },
    [navigate]
  );

  return (
    <main className="min-h-screen bg-[var(--c-navy)]">
      <CommandCenterNav routeLabel="Colombo → Jaffna" />

      <section className="mx-auto max-w-[1400px] px-4 py-8">
        <div className="fade-up overflow-hidden rounded-[28px] border border-[var(--c-border)] bg-[radial-gradient(circle_at_top_right,rgba(15,207,170,0.12),transparent_32%),linear-gradient(135deg,var(--c-navy2),var(--c-navy))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
          <div className="grid gap-8 min-[900px]:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-text3)]">Transit command centre</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[var(--c-text)] sm:text-5xl">
                Track Colombo to Jaffna services with a live timetable, overtake simulator, and dark-map control view.
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--c-text2)]">
                Explore scheduled service behavior, compare recorded real-world journeys, and replay overtake events on a time-space chart or live route map.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-[var(--c-border2)] bg-[var(--c-navy3)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--c-text2)]">
                  Asia/Colombo timing
                </span>
                <span className="rounded-full border border-[color:rgba(15,207,170,0.25)] bg-[color:rgba(15,207,170,0.07)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--c-teal)]">
                  Live overtake insights
                </span>
              </div>
            </div>

            <div className="grid gap-px rounded-[22px] bg-[var(--c-border)] min-[640px]:grid-cols-2">
              {[
                { label: "Coverage", value: "20+ services", tone: "text-[var(--c-text)]" },
                { label: "Live mode", value: "Chart + map", tone: "text-[var(--c-teal)]" },
                { label: "Journey logs", value: "Scheduled vs actual", tone: "text-[var(--c-amber)]" },
                { label: "Visuals", value: "Time-space replay", tone: "text-[var(--c-red2)]" },
              ].map((item) => (
                <div key={item.label} className="bg-[var(--c-navy2)] p-5 transition-all duration-150 ease-out hover:bg-[var(--c-navy3)]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">{item.label}</p>
                  <p className={`mt-3 text-[18px] font-semibold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fade-up fade-delay-1 mt-6">
          <SearchBar onSearch={handleSearch} />
        </div>
      </section>
    </main>
  );
}
