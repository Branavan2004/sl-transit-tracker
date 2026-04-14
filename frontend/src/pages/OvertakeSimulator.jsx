import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ROUTE_ID = "bus-colombo-jaffna-2026-04-16";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toAbsoluteMinutes(stops, departureTime) {
  const dep = parseToMinutes(departureTime);
  return stops.map((s) => {
    let t = parseToMinutes(s.scheduledTime);
    if (t < dep) t += 1440;
    return t;
  });
}

function minutesToHHmm(mins) {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const m = String(Math.round(wrapped % 60)).padStart(2, "0");
  return `${h}:${m}`;
}

function labelFor(vehicleId) {
  return vehicleId.replace(/_/g, " ").slice(0, 20);
}

// Generate visually distinct colors for up to 30 vehicles
function generateColors(n) {
  return Array.from({ length: n }, (_, i) => {
    const hue = Math.round((i * 360) / n);
    return `hsl(${hue}, 80%, 55%)`;
  });
}

// ─── Pulsing overtake annotation plugin ───────────────────────────────────────

const pulsingPlugin = {
  id: "pulsingOvertakes",
  afterDatasetsDraw(chart, _args, options) {
    if (!options.events || options.events.length === 0) return;
    const { ctx } = chart;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const pulse = options.pulse || 0;

    options.events.forEach((ev) => {
      const x = xScale.getPixelForValue(ev.atTimeMinutes);
      const y = yScale.getPixelForValue(ev.atKm);
      if (x === undefined || y === undefined) return;

      const radius = 6 + Math.sin(pulse) * 3;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239,68,68,0.85)";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });
  }
};

ChartJS.register(pulsingPlugin);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OvertakeSimulator() {
  const [vehicles, setVehicles] = useState([]);
  const [overtakes, setOvertakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [onlySelected, setOnlySelected] = useState(false);
  const [timelineMinutes, setTimelineMinutes] = useState(360); // 06:00
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(4); // minutes per tick
  const [pulse, setPulse] = useState(0);
  const animRef = useRef(null);
  const pulseRef = useRef(null);

  // ── Fetch data ──
  useEffect(() => {
    async function load() {
      try {
        const [timetableRes, overtakesRes] = await Promise.all([
          fetch(`${API_BASE}/api/routes/${ROUTE_ID}/timetable`),
          fetch(`${API_BASE}/api/routes/${ROUTE_ID}/overtakes`)
        ]);
        if (!timetableRes.ok || !overtakesRes.ok) throw new Error("API error");
        const timetableData = await timetableRes.json();
        const overtakesData = await overtakesRes.json();
        setVehicles(timetableData.vehicles || []);
        setSelectedIds(new Set((timetableData.vehicles || []).map((v) => v.vehicleId)));
        setOvertakes(overtakesData.overtakes || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Timeline animation ──
  useEffect(() => {
    if (isPlaying) {
      animRef.current = setInterval(() => {
        setTimelineMinutes((prev) => {
          const next = prev + playSpeed;
          if (next > 1900) { setIsPlaying(false); return 1900; }
          return next;
        });
      }, 80);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [isPlaying, playSpeed]);

  // ── Pulse animation for overtake markers ──
  useEffect(() => {
    pulseRef.current = setInterval(() => {
      setPulse((p) => p + 0.12);
    }, 50);
    return () => clearInterval(pulseRef.current);
  }, []);

  const toggleVehicle = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === vehicles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(vehicles.map((v) => v.vehicleId)));
    }
  }, [selectedIds, vehicles]);

  // Vehicles actually shown on chart
  const visibleVehicles = useMemo(
    () => vehicles.filter((v) => selectedIds.has(v.vehicleId)),
    [vehicles, selectedIds]
  );

  // Global min/max time across all visible vehicles (for timeline range)
  const { globalMin, globalMax } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    vehicles.forEach((v) => {
      const abs = toAbsoluteMinutes(v.stops, v.departureTime);
      mn = Math.min(mn, abs[0]);
      mx = Math.max(mx, abs[abs.length - 1]);
    });
    return { globalMin: mn === Infinity ? 360 : mn, globalMax: mx === -Infinity ? 1900 : mx };
  }, [vehicles]);

  const colors = useMemo(() => generateColors(vehicles.length), [vehicles.length]);
  const colorMap = useMemo(() => {
    const m = {};
    vehicles.forEach((v, i) => { m[v.vehicleId] = colors[i]; });
    return m;
  }, [vehicles, colors]);

  // ── Overtake events to show ──
  const visibleOvertakes = useMemo(() => {
    return overtakes.filter((e) => {
      const inSelected = selectedIds.has(e.vehicleA) && selectedIds.has(e.vehicleB);
      if (onlySelected && !inSelected) return false;
      if (!selectedIds.has(e.vehicleA) && !selectedIds.has(e.vehicleB)) return false;
      return e.atTimeMinutes <= timelineMinutes;
    });
  }, [overtakes, selectedIds, onlySelected, timelineMinutes]);

  // ── Chart datasets ──
  const chartData = useMemo(() => {
    const datasets = visibleVehicles.map((v) => {
      const abs = toAbsoluteMinutes(v.stops, v.departureTime);
      const data = v.stops
        .map((s, i) => ({ x: abs[i], y: s.km }))
        .filter((pt) => pt.x <= timelineMinutes);

      return {
        label: labelFor(v.vehicleId),
        vehicleId: v.vehicleId,
        data,
        borderColor: colorMap[v.vehicleId],
        backgroundColor: colorMap[v.vehicleId],
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: false
      };
    });

    return { datasets };
  }, [visibleVehicles, timelineMinutes, colorMap]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    interaction: { mode: "nearest", intersect: false },
    scales: {
      x: {
        type: "linear",
        min: globalMin,
        max: Math.min(timelineMinutes + 30, globalMax),
        title: { display: true, text: "Time (HH:mm)", color: "#94a3b8", font: { size: 12 } },
        ticks: {
          color: "#94a3b8",
          maxTicksLimit: 12,
          callback: (v) => minutesToHHmm(v)
        },
        grid: { color: "rgba(148,163,184,0.1)" }
      },
      y: {
        min: 0,
        max: 435,
        title: { display: true, text: "Distance from Colombo (km)", color: "#94a3b8", font: { size: 12 } },
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(148,163,184,0.1)" }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => minutesToHHmm(items[0].parsed.x),
          label: (item) => `${item.dataset.label} — ${item.parsed.y} km`
        },
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        borderColor: "#334155",
        borderWidth: 1
      },
      pulsingOvertakes: {
        events: visibleOvertakes,
        pulse
      }
    }
  }), [globalMin, globalMax, timelineMinutes, visibleOvertakes, pulse]);

  // ── Sorted overtake log ──
  const overtakeLog = useMemo(
    () => [...visibleOvertakes].sort((a, b) => a.atTimeMinutes - b.atTimeMinutes),
    [visibleOvertakes]
  );

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-400">Loading route data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-xl bg-red-950 border border-red-800 p-8 text-center">
          <p className="text-lg font-semibold text-red-300">Failed to load data</p>
          <p className="mt-2 text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 font-sans text-slate-100">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              🚌 Overtake Simulator
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Colombo → Jaffna · {vehicles.length} vehicles · {overtakes.length} overtakes detected
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-red-300">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              Overtake events: {visibleOvertakes.length}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Chart panel */}
        <div className="flex flex-col gap-3 rounded-2xl bg-slate-900 p-4 shadow-xl">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-3">
            <button
              id="play-pause-btn"
              onClick={() => setIsPlaying((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              id="reset-btn"
              onClick={() => { setTimelineMinutes(globalMin); setIsPlaying(false); }}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              ↺ Reset
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Speed</span>
              <input
                id="speed-slider"
                type="range" min="1" max="12" step="1"
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="w-24 accent-indigo-500"
              />
              <span className="w-6 text-slate-200">{playSpeed}×</span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-slate-400">Time:</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-indigo-300">
                {minutesToHHmm(timelineMinutes)}
              </span>
            </div>
          </div>

          {/* Timeline slider */}
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

          {/* Chart */}
          <div className="h-[480px]">
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
            {vehicles.map((v) => (
              <button
                key={v.vehicleId}
                id={`legend-${v.vehicleId}`}
                onClick={() => toggleVehicle(v.vehicleId)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all
                  ${selectedIds.has(v.vehicleId)
                    ? "bg-slate-800 text-slate-200 opacity-100"
                    : "bg-slate-900 text-slate-500 opacity-50 line-through"
                  }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: colorMap[v.vehicleId] }}
                />
                {labelFor(v.vehicleId)}
              </button>
            ))}
            <button
              id="toggle-all-btn"
              onClick={toggleAll}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
            >
              {selectedIds.size === vehicles.length ? "Hide all" : "Show all"}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Filter toggle */}
          <div className="rounded-xl bg-slate-900 p-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <div className="relative">
                <input
                  id="only-selected-toggle"
                  type="checkbox"
                  checked={onlySelected}
                  onChange={(e) => setOnlySelected(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-indigo-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-4" />
              </div>
              <span className="text-slate-300">Only overtakes between selected vehicles</span>
            </label>
          </div>

          {/* Overtake log */}
          <div className="flex-1 overflow-hidden rounded-xl bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-200">Live Overtake Log</h2>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
                {overtakeLog.length} events
              </span>
            </div>
            <div className="h-[540px] overflow-y-auto px-3 py-2 space-y-2">
              {overtakeLog.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {isPlaying ? "Waiting for overtakes…" : "Play to see overtake events."}
                </p>
              ) : (
                overtakeLog.map((ev, i) => (
                  <div
                    key={`${ev.vehicleA}-${ev.vehicleB}-${ev.atKm}-${i}`}
                    className="rounded-lg border border-slate-800 bg-slate-800/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-red-400">
                          {labelFor(ev.overtakingVehicle)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          overtakes{" "}
                          <span className="text-slate-300">
                            {labelFor(ev.vehicleA === ev.overtakingVehicle ? ev.vehicleB : ev.vehicleA)}
                          </span>
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-mono text-indigo-300">
                          {minutesToHHmm(ev.atTimeMinutes)}
                        </p>
                        <p className="text-xs text-slate-500">{ev.atKm} km</p>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 truncate">
                      📍 {ev.betweenStops[0]} → {ev.betweenStops[1]}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
