// SimulatorLayout.jsx — top-level shell with tab switcher, shared controls & stats bar
import { useState } from "react";
import { SimulatorProvider, minutesToHHmm, labelFor, useSimulator } from "../context/SimulatorContext";
import OvertakeSimulator from "./OvertakeSimulator";
import LiveMap from "./LiveMap";

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const { stats } = useSimulator();
  if (!stats) return null;

  return (
    <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-900 p-3 text-center text-xs">
      <div className="rounded-lg bg-slate-800 px-3 py-2">
        <p className="text-slate-500 uppercase tracking-wide">⚡ Fastest Trip</p>
        <p className="mt-1 font-semibold text-emerald-400 truncate">{labelFor(stats.fastestId)}</p>
        <p className="text-slate-500">{Math.floor(stats.fastestDurMin / 60)}h {stats.fastestDurMin % 60}m</p>
      </div>
      <div className="rounded-lg bg-slate-800 px-3 py-2">
        <p className="text-slate-500 uppercase tracking-wide">🏎 Most Overtakes</p>
        <p className="mt-1 font-semibold text-indigo-400 truncate">{labelFor(stats.mostMadeId)}</p>
        <p className="text-slate-500">{stats.mostMadeCount} overtakes made</p>
      </div>
      <div className="rounded-lg bg-slate-800 px-3 py-2">
        <p className="text-slate-500 uppercase tracking-wide">🐢 Most Overtaken</p>
        <p className="mt-1 font-semibold text-red-400 truncate">{labelFor(stats.mostOvertakenId)}</p>
        <p className="text-slate-500">{stats.mostOvertakenCount} times passed</p>
      </div>
    </div>
  );
}

// ─── Shared Controls Bar ──────────────────────────────────────────────────────
function ControlsBar() {
  const {
    isPlaying, setIsPlaying, playSpeed, setPlaySpeed,
    timelineMinutes, setTimelineMinutes, globalMin, globalMax, resetPlayback,
    xWindow, setXWindow,
    vehicles,
  } = useSimulator();

  const presets = [
    { label: "Morning", min: 360, max: 960 },
    { label: "Night", min: 1080, max: 1920 },
    { label: "All", min: null, max: null },
  ];

  const effectiveWindow = xWindow || { min: globalMin, max: globalMax };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-900 p-3">
      {/* Row 1: Play controls + time display */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          id="play-pause-btn"
          onClick={() => setIsPlaying((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          id="reset-btn"
          onClick={resetPlayback}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          ↺ Reset
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Speed</span>
          <input
            id="speed-slider"
            type="range" min="1" max="16" step="1"
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="w-24 accent-indigo-500"
          />
          <span className="w-6 text-slate-200">{playSpeed}×</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-slate-400">Time:</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-lg text-indigo-300">
            {minutesToHHmm(timelineMinutes)}
          </span>
        </div>
      </div>

      {/* Row 2: Timeline scrubber */}
      <input
        id="timeline-slider"
        type="range"
        min={globalMin}
        max={globalMax}
        step="1"
        value={timelineMinutes}
        onChange={(e) => setTimelineMinutes(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />

      {/* Row 3: Time window zoom */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-2">
        <span className="text-xs text-slate-500 uppercase tracking-wide">Chart window</span>
        <div className="flex gap-1.5">
          {presets.map((p) => {
            const isActive = p.min === null
              ? xWindow === null
              : (xWindow?.min === p.min && xWindow?.max === p.max);
            return (
              <button
                key={p.label}
                onClick={() => setXWindow(p.min === null ? null : { min: p.min, max: p.max })}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors
                  ${isActive ? "bg-indigo-600 text-white" : "border border-slate-700 text-slate-400 hover:bg-slate-800"}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>From</span>
          <input
            type="range" min={globalMin} max={globalMax} step="30"
            value={effectiveWindow.min}
            onChange={(e) => setXWindow({ min: Number(e.target.value), max: effectiveWindow.max })}
            className="w-20 accent-indigo-500"
          />
          <span className="font-mono text-slate-300">{minutesToHHmm(effectiveWindow.min)}</span>
          <span>To</span>
          <input
            type="range" min={globalMin} max={globalMax} step="30"
            value={effectiveWindow.max}
            onChange={(e) => setXWindow({ min: effectiveWindow.min, max: Number(e.target.value) })}
            className="w-20 accent-indigo-500"
          />
          <span className="font-mono text-slate-300">{minutesToHHmm(effectiveWindow.max)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function Shell() {
  const [activeTab, setActiveTab] = useState("chart");
  const { loading, error, vehicles, overtakes } = useSimulator();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-400">Loading timetable & overtake data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-xl bg-red-950 border border-red-800 p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-red-300">Failed to load data</p>
          <p className="mt-2 text-sm text-red-400">{error}</p>
          <p className="mt-4 text-xs text-slate-500">Make sure the backend server is running on port 4000.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 font-sans text-slate-100">
      {/* Header */}
      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">🚌 SL Transit Simulator</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Colombo → Jaffna · {vehicles.length} vehicles · {overtakes.length} overtakes detected
            </p>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="mb-3 flex gap-1 rounded-xl bg-slate-900 p-1 w-fit">
        {[
          { id: "chart", label: "📈 Time-Space Chart" },
          { id: "map", label: "🗺 Live Map" },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="mb-3">
        <StatsBar />
      </div>

      {/* Shared controls */}
      <div className="mb-3">
        <ControlsBar />
      </div>

      {/* Tab content */}
      <div className={activeTab === "chart" ? "block" : "hidden"}>
        <OvertakeSimulator />
      </div>
      <div className={activeTab === "map" ? "block" : "hidden"}>
        <LiveMap />
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function SimulatorLayout() {
  return (
    <SimulatorProvider>
      <Shell />
    </SimulatorProvider>
  );
}
