import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AnimatedNumber from "../components/AnimatedNumber";
import CommandCenterNav from "../components/CommandCenterNav";
import { SimulatorProvider, minutesToHHmm, useSimulator } from "../context/SimulatorContext";
import { countVisibleBusesOnRoad } from "../utils/simulatorMap";
import LiveMap from "./LiveMap";
import OvertakeSimulator from "./OvertakeSimulator";

const ROUTE_LABEL = "Colombo → Jaffna";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M8 6.5v11l9-5.5-9-5.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M7 6.5h3.5v11H7v-11Zm6.5 0H17v11h-3.5v-11Z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 5v5h-5" />
    </svg>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseInputMinutes(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function resolveWindowMinutes(parsed, side, currentWindow) {
  const candidates = [parsed, parsed + 1440];

  if (side === "from") {
    const valid = candidates.filter((candidate) => candidate <= currentWindow.to);
    const pool = valid.length > 0 ? valid : candidates;
    return pool.reduce((best, candidate) => (
      Math.abs(candidate - currentWindow.from) < Math.abs(best - currentWindow.from)
        ? candidate
        : best
    ));
  }

  const valid = candidates.filter((candidate) => candidate >= currentWindow.from);
  const pool = valid.length > 0 ? valid : candidates;
  return pool.reduce((best, candidate) => (
    Math.abs(candidate - currentWindow.to) < Math.abs(best - currentWindow.to)
      ? candidate
      : best
  ));
}

function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function StatStrip() {
  const { stats, vehicles } = useSimulator();

  if (!stats) return null;

  return (
    <section className="fade-up pt-6">
      <div className="grid overflow-hidden rounded-[18px] bg-[var(--c-border)] grid-cols-2 gap-px min-[900px]:grid-cols-4">
        <div className="bg-[var(--c-navy2)] px-6 py-4 transition-all duration-150 ease-out hover:bg-[var(--c-navy3)]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Fastest trip</p>
          <p className="mt-2 truncate text-[16px] font-semibold text-[var(--c-red2)]">{stats.fastestId.replace(/_/g, " ").slice(0, 20)}</p>
          <p className="mt-1 font-mono text-[13px] text-[var(--c-text2)]">
            <AnimatedNumber value={stats.fastestDurMin} formatter={(value) => formatDuration(value)} />
          </p>
        </div>

        <div className="bg-[var(--c-navy2)] px-6 py-4 transition-all duration-150 ease-out hover:bg-[var(--c-navy3)]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Most overtakes</p>
          <p className="mt-2 truncate text-[16px] font-semibold text-[var(--c-teal)]">{stats.mostMadeId.replace(/_/g, " ").slice(0, 20)}</p>
          <p className="mt-1 font-mono text-[13px] text-[var(--c-text2)]">
            <AnimatedNumber value={stats.mostMadeCount} formatter={(value) => `${value} overtakes made`} />
          </p>
        </div>

        <div className="bg-[var(--c-navy2)] px-6 py-4 transition-all duration-150 ease-out hover:bg-[var(--c-navy3)]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Most overtaken</p>
          <p className="mt-2 truncate text-[16px] font-semibold text-[var(--c-amber)]">{stats.mostOvertakenId.replace(/_/g, " ").slice(0, 20)}</p>
          <p className="mt-1 font-mono text-[13px] text-[var(--c-text2)]">
            <AnimatedNumber value={stats.mostOvertakenCount} formatter={(value) => `passed ${value} times`} />
          </p>
        </div>

        <div className="bg-[var(--c-navy2)] px-6 py-4 transition-all duration-150 ease-out hover:bg-[var(--c-navy3)]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Overtake events</p>
          <p className="mt-1 font-mono text-[28px] font-semibold text-[var(--c-text)]">
            <AnimatedNumber value={stats.totalOvertakes} />
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--c-text2)]">
            across <AnimatedNumber value={vehicles.length} /> vehicles
          </p>
        </div>
      </div>
    </section>
  );
}

function ControlsBar() {
  const {
    isPlaying,
    setIsPlaying,
    playSpeed,
    setPlaySpeed,
    timeWindow,
    setTimeWindow,
    globalMin,
    globalMax,
    timelineMinutes,
    resetPlayback,
  } = useSimulator();

  const handlePresetWindow = useCallback((from, to) => {
    setTimeWindow({ from, to });
  }, [setTimeWindow]);

  const handleManualWindow = useCallback((side, hhmm) => {
    const parsed = parseInputMinutes(hhmm);
    if (parsed === null) return;
    setTimeWindow((prev) => ({
      ...prev,
      [side]: clamp(resolveWindowMinutes(parsed, side, prev), globalMin, globalMax),
    }));
  }, [globalMax, globalMin, setTimeWindow]);

  const presets = [
    { label: "Morning", from: 360, to: 960 },
    { label: "Night", from: 1080, to: 1920 },
    { label: "All", from: globalMin, to: globalMax },
  ];

  return (
    <section className="fade-up fade-delay-1 mt-4 overflow-hidden rounded-t-[18px] border border-b-0 border-[var(--c-border)] bg-[var(--c-navy2)]">
      <div className="flex min-h-[52px] flex-wrap items-center gap-3 border-b border-[var(--c-border)] px-4 py-3 min-[900px]:gap-4 min-[900px]:px-6">
        <button
          id="play-pause-btn"
          onClick={() => setIsPlaying((current) => !current)}
          className="flex items-center gap-2 rounded-lg bg-[var(--c-red)] px-5 py-2 text-[13px] font-semibold text-white transition-all duration-150 ease-out hover:bg-[var(--c-red2)] active:scale-[0.97]"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          id="reset-btn"
          onClick={resetPlayback}
          className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3.5 py-2 text-[13px] text-[var(--c-text2)] transition-all duration-150 ease-out hover:bg-[var(--c-navy4)]"
        >
          <ResetIcon />
          Reset
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--c-text3)]">Speed</span>
          <div className="flex rounded-lg border border-[var(--c-border2)] bg-transparent p-1">
            {[1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaySpeed(speed)}
                className={`rounded-md px-3 py-1 text-[12px] font-medium transition-all duration-150 ease-out ${
                  playSpeed === speed
                    ? "bg-[var(--c-navy4)] text-[var(--c-text)]"
                    : "text-[var(--c-text2)] hover:bg-[var(--c-navy4)]"
                }`}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {presets.map((preset) => {
            const isActive = timeWindow.from === preset.from && timeWindow.to === preset.to;
            return (
              <button
                key={preset.label}
                onClick={() => handlePresetWindow(preset.from, preset.to)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ease-out ${
                  isActive
                    ? "border-[color:rgba(15,207,170,0.25)] bg-[color:rgba(15,207,170,0.1)] text-[var(--c-teal)]"
                    : "border-[var(--c-border2)] text-[var(--c-text2)] hover:bg-[var(--c-navy4)]"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--c-text3)]">
            <span>From</span>
            <input
              type="time"
              value={minutesToHHmm(timeWindow.from)}
              onChange={(event) => handleManualWindow("from", event.target.value)}
              className="w-[70px] rounded-md border border-[var(--c-border2)] bg-[var(--c-navy3)] px-2 py-1.5 text-center font-mono text-[13px] text-[var(--c-teal)] outline-none transition-all duration-150 ease-out focus:border-[var(--c-teal)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-[11px] text-[var(--c-text3)]">
            <span>To</span>
            <input
              type="time"
              value={minutesToHHmm(timeWindow.to)}
              onChange={(event) => handleManualWindow("to", event.target.value)}
              className="w-[70px] rounded-md border border-[var(--c-border2)] bg-[var(--c-navy3)] px-2 py-1.5 text-center font-mono text-[13px] text-[var(--c-teal)] outline-none transition-all duration-150 ease-out focus:border-[var(--c-teal)]"
            />
          </label>
        </div>

        <div className="ml-auto flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-text3)]">Time</span>
          <span className="font-mono text-[22px] font-medium text-[var(--c-teal)]">{minutesToHHmm(timelineMinutes)}</span>
        </div>
      </div>
    </section>
  );
}

function TimelineScrubber() {
  const { timelineMinutes, setTimelineMinutes, globalMin, globalMax } = useSimulator();

  const progress = ((timelineMinutes - globalMin) / Math.max(1, globalMax - globalMin)) * 100;
  const ticks = useMemo(() => {
    const firstHour = Math.ceil(globalMin / 60) * 60;
    const nextTicks = [];
    for (let minute = firstHour; minute <= globalMax; minute += 60) {
      nextTicks.push(minute);
    }
    return nextTicks;
  }, [globalMax, globalMin]);

  return (
    <section className="fade-up fade-delay-2 border-x border-b border-[var(--c-border)] bg-[var(--c-navy2)] px-4 pb-4 pt-3 min-[900px]:px-6">
      <div className="relative pb-6">
        <input
          id="timeline-slider"
          type="range"
          min={globalMin}
          max={globalMax}
          step="1"
          value={timelineMinutes}
          onChange={(event) => setTimelineMinutes(Number(event.target.value))}
          className="timeline-range"
          style={{
            background: `linear-gradient(to right, var(--c-teal) 0%, var(--c-teal) ${progress}%, var(--c-border2) ${progress}%, var(--c-border2) 100%)`,
          }}
        />

        <div className="pointer-events-none absolute left-0 right-0 top-4 h-8">
          {ticks.map((tick) => {
            const left = ((tick - globalMin) / Math.max(1, globalMax - globalMin)) * 100;
            return (
              <div key={tick} className="absolute -translate-x-1/2" style={{ left: `${left}%` }}>
                <div className="mx-auto h-[5px] w-px bg-[var(--c-border2)]" />
                {tick % 120 === 0 ? (
                  <p className="mt-1 font-mono text-[10px] text-[var(--c-text3)]">{minutesToHHmm(tick)}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LegendBar() {
  const { vehicles, selectedIds, timelineMinutes } = useSimulator();

  const busesOnRoadCount = useMemo(
    () => countVisibleBusesOnRoad(vehicles, selectedIds, timelineMinutes),
    [selectedIds, timelineMinutes, vehicles]
  );

  return (
    <section className="border-x border-b border-[var(--c-border)] bg-[var(--c-navy2)] px-4 py-3 min-[900px]:px-6">
      <div className="flex flex-wrap items-center gap-4 text-[12px] text-[var(--c-text2)]">
        <span className="flex items-center gap-2">
          <span className="inline-block w-7 border-t-2 border-dashed border-[var(--c-red)]" />
          A9/A3 Highway
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[color:rgba(240,165,0,0.9)]" />
          Overtake flash
        </span>
        <div className="ml-auto flex items-center gap-2 font-mono text-[12px]">
          <span className="text-[var(--c-text2)]">{busesOnRoadCount} buses on road</span>
          <span className="text-[var(--c-text3)]">•</span>
          <span className="text-[var(--c-teal)]">{minutesToHHmm(timelineMinutes)}</span>
        </div>
      </div>
    </section>
  );
}

function Shell() {
  const [searchParams] = useSearchParams();
  const [hasOpenedMap, setHasOpenedMap] = useState(searchParams.get("tab") === "map");
  const { loading, error } = useSimulator();

  const activeView = searchParams.get("tab") === "map" ? "map" : "chart";
  const activeTab = activeView === "map" ? "map" : "simulator";

  useEffect(() => {
    if (activeView === "map") {
      setHasOpenedMap(true);
    }
  }, [activeView]);

  return (
    <div className="min-h-screen bg-[var(--c-navy)]">
      <CommandCenterNav activeTab={activeTab} routeLabel={ROUTE_LABEL} />

      <section className="mx-auto max-w-[1400px] px-4 pb-6">
        {loading ? (
          <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
            <div className="fade-up rounded-[20px] border border-[var(--c-border)] bg-[var(--c-navy2)] px-10 py-12 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--c-teal)] border-t-transparent" />
              <p className="mt-5 text-[14px] text-[var(--c-text2)]">Loading timetable and simulation layers…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
            <div className="fade-up max-w-md rounded-[20px] border border-[color:rgba(226,75,74,0.28)] bg-[color:rgba(176,29,73,0.12)] px-8 py-10 text-center">
              <p className="text-[18px] font-semibold text-[#f0b3b3]">Failed to load simulator</p>
              <p className="mt-3 text-[14px] text-[#e5b2b2]">{error}</p>
            </div>
          </div>
        ) : (
          <>
            <StatStrip />
            <ControlsBar />
            <TimelineScrubber />
            <LegendBar />

            <div className="fade-up fade-delay-3 transition-opacity duration-200 min-[900px]:h-[calc(100vh-220px)]">
              {activeView === "map" ? (
                <div className="h-[calc(100vh-220px)] min-h-[520px]">
                  {hasOpenedMap ? <LiveMap isActive /> : null}
                </div>
              ) : (
                <div className="min-h-[720px] min-[900px]:h-full">
                  <OvertakeSimulator />
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function SimulatorLayout() {
  return (
    <SimulatorProvider>
      <Shell />
    </SimulatorProvider>
  );
}
