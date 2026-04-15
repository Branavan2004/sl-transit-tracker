import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { labelFor, minutesToHHmm, parseToMinutes, toAbsoluteMinutes, useSimulator } from "../context/SimulatorContext";

const THEME = {
  navy2: "#0c1525",
  navy3: "#111e35",
  border2: "rgba(255,255,255,0.13)",
  text: "#e4ecf7",
  text2: "#8fa3c0",
  text3: "#4a607d",
  amber: "rgba(240,165,0,0.9)",
};

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip);

const overtakeFlashPlugin = {
  id: "overtakeFlashPlugin",
  afterDatasetsDraw(chart, _args, options) {
    const { flashed = null, pulse = 0 } = options;
    if (!flashed) return;

    const { ctx, scales: { x, y } } = chart;
    const px = x.getPixelForValue(flashed.atTimeMinutes);
    const py = y.getPixelForValue(flashed.atKm);

    if (!Number.isFinite(px) || !Number.isFinite(py)) return;

    const radius = 14 + Math.abs(Math.sin(pulse)) * 8;

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(240,165,0,0.18)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#f0a500";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  },
};

ChartJS.register(overtakeFlashPlugin);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function withOpacity(color, opacity = 0.15) {
  if (color.startsWith("hsl")) {
    return color.replace("hsl(", "hsla(").replace(")", `, ${opacity})`);
  }

  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const full = hex.length === 3
      ? hex.split("").map((char) => char + char).join("")
      : hex.slice(0, 6);
    const red = parseInt(full.slice(0, 2), 16);
    const green = parseInt(full.slice(2, 4), 16);
    const blue = parseInt(full.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }

  return color;
}

function shortenLabel(value, max = 16) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function HoverCard({ vehicleId, vehicles, timelineMinutes, colorMap }) {
  const vehicle = vehicles.find((item) => item.vehicleId === vehicleId);
  if (!vehicle) return null;

  const absoluteMinutes = toAbsoluteMinutes(vehicle.stops, vehicle.departureTime);
  let currentKm = null;
  let nextStopName = null;
  let nextStopTime = null;

  for (let index = 0; index < absoluteMinutes.length - 1; index += 1) {
    if (absoluteMinutes[index] <= timelineMinutes && timelineMinutes <= absoluteMinutes[index + 1]) {
      const ratio = (timelineMinutes - absoluteMinutes[index]) / (absoluteMinutes[index + 1] - absoluteMinutes[index]);
      currentKm = (vehicle.stops[index].km + ratio * (vehicle.stops[index + 1].km - vehicle.stops[index].km)).toFixed(0);
      nextStopName = vehicle.stops[index + 1].name;
      nextStopTime = minutesToHHmm(absoluteMinutes[index + 1]);
      break;
    }
  }

  return (
    <div
      className="pointer-events-none absolute right-4 top-4 z-10 w-56 rounded-xl border border-[var(--c-border2)] bg-[color:rgba(12,21,37,0.94)] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
      style={{ borderLeft: `3px solid ${colorMap[vehicleId]}` }}
    >
      <p className="text-[13px] font-semibold text-[var(--c-text)]">{labelFor(vehicleId)}</p>
      {currentKm !== null ? (
        <div className="mt-2 space-y-1 text-[12px] text-[var(--c-text2)]">
          <p>Position <span className="font-mono text-[var(--c-text)]">{currentKm} km</span></p>
          <p>Next stop <span className="text-[var(--c-text)]">{nextStopName}</span></p>
          <p>ETA <span className="font-mono text-[var(--c-teal)]">{nextStopTime}</span></p>
        </div>
      ) : (
        <p className="mt-2 text-[12px] italic text-[var(--c-text3)]">Not yet departed or already arrived</p>
      )}
    </div>
  );
}

export default function OvertakeSimulator() {
  const {
    vehicles,
    actualJourneys,
    timelineMinutes,
    isPlaying,
    selectedIds,
    toggleVehicle,
    toggleAll,
    onlySelected,
    setOnlySelected,
    hoveredVehicleId,
    setHoveredVehicleId,
    flashedOvertake,
    flashOvertakeEvent,
    globalMin,
    globalMax,
    colorMap,
    visibleOvertakes,
    pulse,
    timeWindow,
    setTimeWindow,
  } = useSimulator();

  const chartRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const defaultStyleRef = useRef(new Map());
  const [highlightIds, setHighlightIds] = useState(new Set());
  const [eventFilter, setEventFilter] = useState("");

  const visibleVehicles = useMemo(
    () => vehicles.filter((vehicle) => selectedIds.has(vehicle.vehicleId)),
    [selectedIds, vehicles]
  );

  const xMin = clamp(Math.min(timeWindow.from, timeWindow.to), globalMin, globalMax);
  const xMax = clamp(Math.max(timeWindow.from, timeWindow.to), globalMin, globalMax);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const chartData = useMemo(() => {
    const isAnyHovered = hoveredVehicleId !== null;
    const kmLookup = {};

    vehicles.forEach((vehicle) => {
      kmLookup[vehicle.vehicleId] = {};
      vehicle.stops.forEach((stop) => {
        kmLookup[vehicle.vehicleId][stop.name] = stop.km;
      });
    });

    const datasets = visibleVehicles.map((vehicle) => {
      const absoluteMinutes = toAbsoluteMinutes(vehicle.stops, vehicle.departureTime);
      const isHovered = hoveredVehicleId === vehicle.vehicleId;
      const isHighlighted = highlightIds.size > 0 && highlightIds.has(vehicle.vehicleId);
      const dimmed = (isAnyHovered && !isHovered) || (highlightIds.size > 0 && !isHighlighted);

      return {
        label: labelFor(vehicle.vehicleId),
        vehicleId: vehicle.vehicleId,
        data: vehicle.stops
          .map((stop, index) => ({ x: absoluteMinutes[index], y: stop.km }))
          .filter((point) => point.x <= timelineMinutes),
        borderColor: dimmed ? withOpacity(colorMap[vehicle.vehicleId], 0.1) : colorMap[vehicle.vehicleId],
        backgroundColor: colorMap[vehicle.vehicleId],
        borderWidth: isHovered || isHighlighted ? 3 : 1.5,
        pointRadius: isHovered ? 3 : 0,
        pointHoverRadius: 5,
        tension: 0.2,
        fill: false,
      };
    });

    (actualJourneys || []).forEach((journey) => {
      if (!selectedIds.has(journey.vehicleId)) return;

      const vehicle = vehicles.find((item) => item.vehicleId === journey.vehicleId);
      if (!vehicle) return;

      const departureMinutes = parseToMinutes(vehicle.departureTime);
      const lookup = kmLookup[journey.vehicleId] || {};
      const points = journey.stops
        .filter((stop) => stop.actualTime && lookup[stop.name] !== undefined)
        .map((stop) => {
          let minutes = parseToMinutes(stop.actualTime);
          if (minutes < departureMinutes) minutes += 1440;
          return { x: minutes, y: lookup[stop.name] };
        })
        .filter((point) => point.x <= timelineMinutes);

      if (points.length < 2) return;

      const dateLabel = journey.date
        ? new Date(journey.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : "actual";

      datasets.push({
        label: `${labelFor(journey.vehicleId)} (actual – ${dateLabel})`,
        vehicleId: `${journey.vehicleId}_actual`,
        data: points,
        borderColor: withOpacity(colorMap[journey.vehicleId], 0.6),
        backgroundColor: withOpacity(colorMap[journey.vehicleId], 0.2),
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.2,
        fill: false,
      });
    });

    datasets.push({
      label: "Overtakes",
      data: visibleOvertakes
        .filter((event) => highlightIds.size === 0 || highlightIds.has(event.vehicleA) || highlightIds.has(event.vehicleB))
        .map((event) => ({ x: event.atTimeMinutes, y: event.atKm, event })),
      showLine: false,
      borderWidth: 0,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointHitRadius: 14,
      pointBackgroundColor: THEME.amber,
      pointBorderWidth: 0,
      order: 100,
    });

    return { datasets };
  }, [
    actualJourneys,
    colorMap,
    highlightIds,
    hoveredVehicleId,
    selectedIds,
    timelineMinutes,
    vehicles,
    visibleOvertakes,
    visibleVehicles,
  ]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    interaction: { mode: "nearest", intersect: false, axis: "xy" },
    onHover: (_event, elements) => {
      if (elements.length === 0) {
        setHoveredVehicleId(null);
        return;
      }

      const dataset = chartData.datasets[elements[0].datasetIndex];
      const rawVehicleId = dataset?.vehicleId;
      if (!rawVehicleId) {
        setHoveredVehicleId(null);
        return;
      }

      const nextVehicleId = rawVehicleId.endsWith("_actual")
        ? rawVehicleId.replace(/_actual$/, "")
        : rawVehicleId;

      setHoveredVehicleId(nextVehicleId);
    },
    scales: {
      x: {
        type: "linear",
        min: xMin,
        max: xMax,
        title: {
          display: true,
          text: "Time",
          color: THEME.text3,
          font: { family: "Sora, sans-serif", size: 11, weight: "600" },
        },
        ticks: {
          color: THEME.text3,
          font: { family: "JetBrains Mono, monospace", size: 11 },
          maxTicksLimit: 10,
          callback: (value) => minutesToHHmm(value),
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        min: 0,
        max: 435,
        title: {
          display: true,
          text: "Distance (km)",
          color: THEME.text3,
          font: { family: "Sora, sans-serif", size: 11, weight: "600" },
        },
        ticks: {
          color: THEME.text3,
          font: { family: "JetBrains Mono, monospace", size: 11 },
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        backgroundColor: THEME.navy3,
        borderColor: THEME.border2,
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        titleColor: THEME.text,
        bodyColor: THEME.text2,
        titleFont: { family: "Sora, sans-serif", size: 13, weight: "600" },
        bodyFont: { family: "JetBrains Mono, monospace", size: 12, weight: "500" },
        callbacks: {
          title: (items) => {
            const raw = items[0]?.raw;
            if (raw?.event) {
              const event = raw.event;
              const victim = event.vehicleA === event.overtakingVehicle ? event.vehicleB : event.vehicleA;
              return `${labelFor(event.overtakingVehicle)} overtakes ${labelFor(victim)}`;
            }
            return items[0]?.dataset?.label ?? "";
          },
          label: (item) => {
            const raw = item.raw;
            if (raw?.event) {
              return `km ${Math.round(raw.event.atKm)} · ${minutesToHHmm(raw.event.atTimeMinutes)}`;
            }
            return `${minutesToHHmm(item.parsed.x)} · ${Math.round(item.parsed.y)} km`;
          },
        },
      },
      overtakeFlashPlugin: {
        flashed: flashedOvertake,
        pulse,
      },
    },
  }), [chartData.datasets, flashedOvertake, pulse, setHoveredVehicleId, xMax, xMin]);

  const overtakeLog = useMemo(
    () => [...visibleOvertakes].sort((left, right) => left.atTimeMinutes - right.atTimeMinutes),
    [visibleOvertakes]
  );

  const filteredOvertakeLog = useMemo(() => {
    const query = eventFilter.trim().toLowerCase();
    if (!query) return overtakeLog;

    return overtakeLog.filter((event) => {
      const victim = event.vehicleA === event.overtakingVehicle ? event.vehicleB : event.vehicleA;
      const searchable = [
        labelFor(event.overtakingVehicle),
        labelFor(victim),
        event.betweenStops[0],
        event.betweenStops[1],
        minutesToHHmm(event.atTimeMinutes),
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [eventFilter, overtakeLog]);

  const applyLegendHoverHighlight = useCallback((vehicleId) => {
    const chart = chartRef.current;
    if (!chart?.data?.datasets) return;

    chart.data.datasets.forEach((dataset, index) => {
      if (!dataset.vehicleId || dataset.vehicleId.endsWith("_actual")) return;

      if (!defaultStyleRef.current.has(index)) {
        defaultStyleRef.current.set(index, {
          borderColor: dataset.borderColor,
          borderWidth: dataset.borderWidth ?? 1.5,
          pointRadius: dataset.pointRadius ?? 0,
          borderDash: dataset.borderDash ?? [],
        });
      }

      if (dataset.vehicleId === vehicleId) {
        dataset.borderWidth = 3;
        dataset.pointRadius = 4;
        dataset.borderDash = [];
        dataset.borderColor = colorMap[dataset.vehicleId];
      } else {
        dataset.borderColor = withOpacity(colorMap[dataset.vehicleId], 0.1);
      }
    });

    chart.update("none");
  }, [colorMap]);

  const resetLegendHoverHighlight = useCallback(() => {
    const chart = chartRef.current;
    if (!chart?.data?.datasets) return;

    chart.data.datasets.forEach((dataset, index) => {
      const defaults = defaultStyleRef.current.get(index);
      if (!defaults) return;

      dataset.borderColor = defaults.borderColor;
      dataset.borderWidth = defaults.borderWidth;
      dataset.pointRadius = defaults.pointRadius;
      dataset.borderDash = defaults.borderDash;
    });

    defaultStyleRef.current.clear();
    chart.update("none");
  }, []);

  const handleLogClick = useCallback((event) => {
    flashOvertakeEvent(event);
    setHighlightIds(new Set([event.vehicleA, event.vehicleB]));
    setTimeWindow({
      from: clamp(event.atTimeMinutes - 30, globalMin, globalMax),
      to: clamp(event.atTimeMinutes + 30, globalMin, globalMax),
    });

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = setTimeout(() => setHighlightIds(new Set()), 2000);
  }, [flashOvertakeEvent, globalMax, globalMin, setTimeWindow]);

  return (
    <div className="grid min-h-[720px] overflow-hidden border-x border-b border-[var(--c-border)] min-[900px]:h-full min-[900px]:min-h-0 min-[900px]:grid-cols-[1fr_320px]">
      <div className="min-h-0 bg-[var(--c-navy)] px-4 py-5 min-[900px]:overflow-y-auto min-[900px]:px-6">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex min-h-[420px] flex-1 flex-col rounded-[14px] border border-[var(--c-border)] bg-[var(--c-navy2)] p-4">
            <div className="relative min-h-[360px] flex-1">
              {hoveredVehicleId ? (
                <HoverCard
                  vehicleId={hoveredVehicleId}
                  vehicles={vehicles}
                  timelineMinutes={timelineMinutes}
                  colorMap={colorMap}
                />
              ) : null}
              <Line ref={chartRef} data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-2">
              {vehicles.map((vehicle) => {
                const isSelected = selectedIds.has(vehicle.vehicleId);
                const isFocused = hoveredVehicleId === vehicle.vehicleId || highlightIds.has(vehicle.vehicleId);

                return (
                  <button
                    key={vehicle.vehicleId}
                    onClick={() => toggleVehicle(vehicle.vehicleId)}
                    onMouseEnter={() => {
                      setHoveredVehicleId(vehicle.vehicleId);
                      applyLegendHoverHighlight(vehicle.vehicleId);
                    }}
                    onMouseLeave={() => {
                      setHoveredVehicleId(null);
                      resetLegendHoverHighlight();
                    }}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] transition-all duration-150 ease-out ${
                      !isSelected
                        ? "border-[var(--c-border)] bg-[var(--c-navy3)] text-[var(--c-text3)] opacity-45 line-through"
                        : isFocused
                          ? "border-[var(--c-teal)] bg-[var(--c-navy4)] text-[var(--c-teal)]"
                          : "border-[var(--c-border)] bg-[var(--c-navy3)] text-[var(--c-text2)] hover:bg-[var(--c-navy4)]"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorMap[vehicle.vehicleId] }} />
                    {shortenLabel(labelFor(vehicle.vehicleId))}
                  </button>
                );
              })}

              <button
                onClick={() => toggleAll(vehicles)}
                className="rounded-md border border-[var(--c-border2)] px-3 py-1.5 text-[12px] text-[var(--c-text2)] transition-all duration-150 ease-out hover:bg-[var(--c-navy4)]"
              >
                {selectedIds.size === vehicles.length ? "Hide all" : "Show all"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="flex min-h-[320px] min-w-0 flex-col border-t border-[var(--c-border)] bg-[var(--c-navy2)] p-4 min-[900px]:min-h-0 min-[900px]:border-l min-[900px]:border-t-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-[var(--c-text)]">Live Overtakes</h2>
          <span className="rounded-full border border-[color:rgba(240,165,0,0.2)] bg-[color:rgba(240,165,0,0.1)] px-2 py-1 font-mono text-[11px] text-[var(--c-amber)]">
            {filteredOvertakeLog.length}
          </span>
        </div>

        <input
          type="search"
          value={eventFilter}
          onChange={(event) => setEventFilter(event.target.value)}
          placeholder="Filter vehicles…"
          className="mb-3 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-navy3)] px-3 py-2 text-[12px] text-[var(--c-text)] outline-none transition-all duration-150 ease-out placeholder:text-[var(--c-text3)] focus:border-[var(--c-teal)]"
        />

        <label className="mb-4 flex items-center gap-2 text-[12px] text-[var(--c-text2)]">
          <input
            type="checkbox"
            checked={onlySelected}
            onChange={(event) => setOnlySelected(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--c-border2)] bg-[var(--c-navy3)] accent-[var(--c-teal)]"
          />
          Selected pairs only
        </label>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {filteredOvertakeLog.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--c-border)] px-4 py-8 text-center text-[13px] text-[var(--c-text3)]">
              {isPlaying ? "Waiting for new overtakes…" : "Play the timeline to see overtake events."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredOvertakeLog.map((event, index) => {
                const victim = event.vehicleA === event.overtakingVehicle ? event.vehicleB : event.vehicleA;
                const isActive = flashedOvertake?.vehicleA === event.vehicleA
                  && flashedOvertake?.vehicleB === event.vehicleB
                  && flashedOvertake?.atKm === event.atKm;

                return (
                  <button
                    key={`${event.vehicleA}-${event.vehicleB}-${event.atKm}-${index}`}
                    onClick={() => handleLogClick(event)}
                    className={`log-enter w-full rounded-r-lg border border-[var(--c-border)] px-3 py-3 text-left transition-all duration-150 ease-out ${
                      isActive
                        ? "border-l-2 border-l-[var(--c-teal)] bg-[color:rgba(15,207,170,0.06)]"
                        : "border-l-2 border-l-transparent bg-transparent hover:border-l-[var(--c-amber)] hover:bg-[var(--c-navy4)]"
                    }`}
                    style={{ animationDelay: `${Math.min(index, 4) * 40}ms` }}
                  >
                    <div className="flex flex-wrap items-center gap-1 text-[12px]">
                      <span className="font-semibold text-[var(--c-teal)]">{labelFor(event.overtakingVehicle)}</span>
                      <span className="text-[var(--c-text3)]">overtakes</span>
                      <span className="text-[var(--c-text2)]">{labelFor(victim)}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-[var(--c-text3)]">
                      km {Math.round(event.atKm)} · {event.betweenStops[0]} → {event.betweenStops[1]} · {minutesToHHmm(event.atTimeMinutes)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
