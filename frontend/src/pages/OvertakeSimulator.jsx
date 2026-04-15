// OvertakeSimulator.jsx — time-space chart panel (reads all state from SimulatorContext)
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  useSimulator,
  toAbsoluteMinutes,
  minutesToHHmm,
  labelFor,
} from "../context/SimulatorContext";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip);

// ─── Pulsing overtake annotation plugin ───────────────────────────────────────
const pulsingOvertakesPlugin = {
  id: "pulsingOvertakes",
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx, scales: { x: xScale, y: yScale } } = chart;
    const { events = [], flashed = null, pulse = 0, highlightIds = new Set() } = opts;

    // Draw regular overtake dots
    events.forEach((ev) => {
      if (highlightIds.size > 0 && !highlightIds.has(ev.vehicleA) && !highlightIds.has(ev.vehicleB)) return;
      const px = xScale.getPixelForValue(ev.atTimeMinutes);
      const py = yScale.getPixelForValue(ev.atKm);
      if (!isFinite(px) || !isFinite(py)) return;
      const r = 5 + Math.sin(pulse) * 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239,68,68,0.85)";
      ctx.fill();
      ctx.strokeStyle = "#fff3";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    // Draw flashed overtake (orange burst)
    if (flashed) {
      const px = xScale.getPixelForValue(flashed.atTimeMinutes);
      const py = yScale.getPixelForValue(flashed.atKm);
      if (isFinite(px) && isFinite(py)) {
        const r = 14 + Math.abs(Math.sin(pulse)) * 8;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251,146,60,0.55)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#fb923c";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
  },
};

ChartJS.register(pulsingOvertakesPlugin);

// ─── Vehicle hover tooltip card ───────────────────────────────────────────────
function HoverCard({ vehicleId, vehicles, timelineMinutes, colorMap }) {
  const v = vehicles.find((x) => x.vehicleId === vehicleId);
  if (!v) return null;

  const abs = toAbsoluteMinutes(v.stops, v.departureTime);
  // Find current position (km) and next stop
  let currentKm = null, nextStopName = null, nextStopTime = null;
  for (let i = 0; i < abs.length - 1; i++) {
    if (abs[i] <= timelineMinutes && timelineMinutes <= abs[i + 1]) {
      const ratio = (timelineMinutes - abs[i]) / (abs[i + 1] - abs[i]);
      currentKm = (v.stops[i].km + ratio * (v.stops[i + 1].km - v.stops[i].km)).toFixed(0);
      nextStopName = v.stops[i + 1].name;
      nextStopTime = minutesToHHmm(abs[i + 1]);
      break;
    }
  }

  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-10 w-52 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-2xl text-xs"
      style={{ borderLeftColor: colorMap[vehicleId], borderLeftWidth: "3px" }}
    >
      <p className="font-semibold text-slate-200 truncate">{labelFor(vehicleId)}</p>
      {currentKm !== null ? (
        <>
          <p className="mt-1 text-slate-400">Position: <span className="text-slate-200">{currentKm} km</span></p>
          <p className="text-slate-400">Next: <span className="text-slate-200 truncate">{nextStopName}</span></p>
          <p className="text-slate-400">ETA: <span className="font-mono text-indigo-300">{nextStopTime}</span></p>
        </>
      ) : (
        <p className="mt-1 text-slate-500 italic">Not yet departed / arrived</p>
      )}
    </div>
  );
}

// ─── Main Chart Component ─────────────────────────────────────────────────────
export default function OvertakeSimulator() {
  const {
    vehicles, overtakes,
    timelineMinutes, isPlaying,
    selectedIds, toggleVehicle, toggleAll, onlySelected, setOnlySelected,
    hoveredVehicleId, setHoveredVehicleId,
    flashedOvertake, flashOvertakeEvent,
    globalMin, globalMax, colorMap, visibleOvertakes,
    xWindow, pulse,
  } = useSimulator();

  const chartRef = useRef(null);
  const [highlightIds, setHighlightIds] = useState(new Set());

  const visibleVehicles = useMemo(
    () => vehicles.filter((v) => selectedIds.has(v.vehicleId)),
    [vehicles, selectedIds]
  );

  // ── Effective x window ──
  const { xMin, xMax } = useMemo(() => {
    const w = xWindow || { min: globalMin, max: globalMax };
    return { xMin: w.min, xMax: w.max };
  }, [xWindow, globalMin, globalMax]);

  // ── Chart datasets ──
  const chartData = useMemo(() => {
    const isAnyHovered = hoveredVehicleId !== null;
    const datasets = visibleVehicles.map((v) => {
      const abs = toAbsoluteMinutes(v.stops, v.departureTime);
      const data = v.stops
        .map((s, i) => ({ x: abs[i], y: s.km }))
        .filter((pt) => pt.x <= timelineMinutes);

      const isHovered = hoveredVehicleId === v.vehicleId;
      const isHighlighted = highlightIds.size > 0 && highlightIds.has(v.vehicleId);
      const dimmed = (isAnyHovered && !isHovered) || (highlightIds.size > 0 && !isHighlighted);

      return {
        label: labelFor(v.vehicleId),
        vehicleId: v.vehicleId,
        data,
        borderColor: colorMap[v.vehicleId],
        backgroundColor: colorMap[v.vehicleId],
        borderWidth: isHovered || isHighlighted ? 4 : 2,
        borderCapStyle: "round",
        borderOpacity: dimmed ? 0.12 : 1,
        pointRadius: isHovered ? 4 : 2,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: false,
        // Store opacity via alpha manipulation
        ...(dimmed ? { borderColor: colorMap[v.vehicleId] + "22" } : {}),
      };
    });
    return { datasets };
  }, [visibleVehicles, timelineMinutes, colorMap, hoveredVehicleId, highlightIds]);

  // ── Chart options ──
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    interaction: { mode: "nearest", intersect: false, axis: "x" },
    onHover: (_evt, elements) => {
      if (elements.length > 0) {
        const ds = chartData.datasets[elements[0].datasetIndex];
        if (ds?.vehicleId) setHoveredVehicleId(ds.vehicleId);
      } else {
        setHoveredVehicleId(null);
      }
    },
    scales: {
      x: {
        type: "linear",
        min: xMin,
        max: xMax,
        title: { display: true, text: "Time (HH:mm)", color: "#94a3b8", font: { size: 11 } },
        ticks: { color: "#94a3b8", maxTicksLimit: 10, callback: (v) => minutesToHHmm(v) },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
      y: {
        min: 0,
        max: 435,
        title: { display: true, text: "Distance from Colombo (km)", color: "#94a3b8", font: { size: 11 } },
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => minutesToHHmm(items[0].parsed.x),
          label: (item) => `${item.dataset.label} — ${item.parsed.y} km`,
        },
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        borderColor: "#334155",
        borderWidth: 1,
      },
      pulsingOvertakes: {
        events: visibleOvertakes,
        flashed: flashedOvertake,
        pulse,
        highlightIds,
      },
    },
  }), [xMin, xMax, visibleOvertakes, flashedOvertake, pulse, highlightIds, chartData, setHoveredVehicleId]);

  // ── Overtake log sorted by time ──
  const overtakeLog = useMemo(
    () => [...visibleOvertakes].sort((a, b) => a.atTimeMinutes - b.atTimeMinutes),
    [visibleOvertakes]
  );

  const handleLogClick = useCallback((ev) => {
    flashOvertakeEvent(ev);
    setHighlightIds(new Set([ev.vehicleA, ev.vehicleB]));
    setTimeout(() => setHighlightIds(new Set()), 2000);
  }, [flashOvertakeEvent]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      {/* Chart panel */}
      <div className="flex flex-col gap-3 rounded-2xl bg-slate-900 p-4 shadow-xl">
        {/* Chart with hover card */}
        <div className="relative h-[460px]">
          {hoveredVehicleId && (
            <HoverCard
              vehicleId={hoveredVehicleId}
              vehicles={vehicles}
              timelineMinutes={timelineMinutes}
              colorMap={colorMap}
            />
          )}
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        </div>

        {/* Legend row */}
        <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
          {vehicles.map((v) => (
            <button
              key={v.vehicleId}
              id={`legend-${v.vehicleId}`}
              onClick={() => toggleVehicle(v.vehicleId)}
              onMouseEnter={() => setHoveredVehicleId(v.vehicleId)}
              onMouseLeave={() => setHoveredVehicleId(null)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all
                ${selectedIds.has(v.vehicleId)
                  ? "bg-slate-800 text-slate-200"
                  : "bg-slate-900 text-slate-600 line-through opacity-40"
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
            onClick={() => toggleAll(vehicles)}
            className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
          >
            {selectedIds.size === vehicles.length ? "Hide all" : "Show all"}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-3">
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
            <span className="text-slate-300 text-xs">Only overtakes between selected vehicles</span>
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
          <div className="h-[480px] overflow-y-auto px-3 py-2 space-y-1.5">
            {overtakeLog.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {isPlaying ? "Waiting for overtakes…" : "Play the timeline to see events."}
              </p>
            ) : (
              overtakeLog.map((ev, i) => {
                const victim = ev.vehicleA === ev.overtakingVehicle ? ev.vehicleB : ev.vehicleA;
                const isFlashed = flashedOvertake?.vehicleA === ev.vehicleA &&
                  flashedOvertake?.vehicleB === ev.vehicleB &&
                  flashedOvertake?.atKm === ev.atKm;
                return (
                  <button
                    key={`${ev.vehicleA}-${ev.vehicleB}-${ev.atKm}-${i}`}
                    onClick={() => handleLogClick(ev)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all
                      ${isFlashed
                        ? "border-orange-500/60 bg-orange-950/40 ring-1 ring-orange-500/40"
                        : "border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-red-400 truncate">
                          {labelFor(ev.overtakingVehicle)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          overtakes <span className="text-slate-300">{labelFor(victim)}</span>
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-mono text-indigo-300">{minutesToHHmm(ev.atTimeMinutes)}</p>
                        <p className="text-xs text-slate-500">{ev.atKm} km</p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      📍 {ev.betweenStops[0]} → {ev.betweenStops[1]}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
