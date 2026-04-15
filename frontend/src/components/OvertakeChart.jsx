// Renders animated time-space overtake simulation with controls and event log.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const palette = ["#0f766e", "#2563eb", "#7c3aed", "#ea580c", "#16a34a"];
const dashes = [[], [8, 4], [3, 3], [10, 6, 2, 6], [2, 3]];

function parseTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function interpolate(stops, mode, targetKm) {
  const nextIdx = stops.findIndex((s) => s.km >= targetKm);
  if (nextIdx === -1) return null;
  if (nextIdx === 0) return parseTime(stops[0][mode]);
  
  const s1 = stops[nextIdx - 1];
  const s2 = stops[nextIdx];
  const t1 = parseTime(s1[mode]);
  const t2 = parseTime(s2[mode]);
  
  const span = s2.km - s1.km;
  if (span === 0) return t1;
  const ratio = (targetKm - s1.km) / span;
  return t1 + ratio * (t2 - t1);
}

function detectOvertakes(buses, mode) {
  const events = [];
  // Resolution: check every 2km for speed and accuracy balance
  const resolution = 2;
  
  for (let i = 0; i < buses.length; i += 1) {
    for (let j = i + 1; j < buses.length; j += 1) {
      const b1 = buses[i];
      const b2 = buses[j];
      
      const minKm = Math.max(b1.stops[0].km, b2.stops[0].km);
      const maxKm = Math.min(b1.stops[b1.stops.length - 1].km, b2.stops[b2.stops.length - 1].km);
      
      let prevD = null;
      for (let km = minKm; km <= maxKm; km += resolution) {
        const t1 = interpolate(b1.stops, mode, km);
        const t2 = interpolate(b2.stops, mode, km);
        
        if (t1 === null || t2 === null) continue;
        const d = t1 - t2;
        
        if (prevD !== null && d * prevD < 0) {
          // Intersection occurred between last point and this one
          const ratio = Math.abs(prevD) / (Math.abs(prevD) + Math.abs(d));
          const intersectTime = (t1 - d) + ratio * ((t1) - (t1 - d)); // Approximate
          const intersectKm = km - resolution + ratio * resolution;
          
          const leadBus = prevD > 0 ? b2 : b1;
          const passBus = prevD > 0 ? b1 : b2;
          
          events.push({
            id: `${b1.busId}-${b2.busId}-${km}`,
            x: Math.round(t1 - d + ratio * ((t1) - (t1 - d))), // Corrected X
            y: intersectKm,
            label: `${passBus.name} overtook ${leadBus.name} at ~${Math.round(intersectKm)}km`
          });
        }
        prevD = d;
      }
    }
  }
  return events.sort((left, right) => left.x - right.x);
}

export default function OvertakeChart({ buses }) {
  const [mode, setMode] = useState("actualTime");
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedBusIds, setSelectedBusIds] = useState(() => buses.map((bus) => bus.busId));

  const allTimes = useMemo(() => buses.flatMap((bus) => bus.stops.map((stop) => parseTime(stop[mode]))), [buses, mode]);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);

  const visibleBuses = useMemo(
    () => buses.filter((bus) => selectedBusIds.includes(bus.busId)),
    [buses, selectedBusIds]
  );
  const overtakeEvents = useMemo(() => detectOvertakes(visibleBuses, mode), [visibleBuses, mode]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      setProgress((current) => {
        const next = current + speed * 2;
        if (next >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });
    }, 120);
    return () => clearInterval(timer);
  }, [isPlaying, speed, maxTime]);

  useEffect(() => {
    setProgress(minTime);
    setIsPlaying(false);
  }, [mode, minTime, selectedBusIds]);

  const toggleBus = useCallback((busId) => {
    setSelectedBusIds((current) =>
      current.includes(busId) ? current.filter((id) => id !== busId) : [...current, busId]
    );
  }, []);

  const chartData = useMemo(() => {
    const datasets = visibleBuses.map((bus, index) => ({
      label: bus.name,
      data: bus.stops
        .map((stop) => ({ x: parseTime(stop[mode]), y: stop.km }))
        .filter((point) => point.x <= progress)
        .map((point) => ({ ...point, x: point.x - minTime })),
      borderColor: palette[index % palette.length],
      borderDash: dashes[index % dashes.length],
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.25
    }));

    datasets.push({
      label: "Overtake events",
      data: overtakeEvents
        .filter((event) => event.x <= progress)
        .map((event) => ({ x: event.x - minTime, y: event.y, label: event.label })),
      borderColor: "#dc2626",
      backgroundColor: "#dc2626",
      pointRadius: 5,
      showLine: false
    });
    return { datasets };
  }, [visibleBuses, mode, progress, overtakeEvents, minTime]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      scales: {
        x: { type: "linear", title: { display: true, text: "Time (minutes from departure)" } },
        y: { title: { display: true, text: "Distance from Colombo (km)" } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              return context.raw.label || `${context.dataset.label}: ${Math.round(context.raw.x)} min, ${context.raw.y} km`;
            }
          }
        }
      }
    }),
    []
  );

  const liveLog = useMemo(() => overtakeEvents.filter((event) => event.x <= progress), [overtakeEvents, progress]);

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsPlaying((value) => !value)}
            className="rounded-lg bg-[var(--c-red)] px-3 py-2 text-sm font-semibold text-white transition-all duration-150 ease-out hover:bg-[var(--c-red2)]"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => setProgress(minTime)}
            className="rounded-lg border border-[var(--c-border2)] px-3 py-2 text-sm text-[var(--c-text2)] transition-all duration-150 ease-out hover:bg-[var(--c-navy4)]"
          >
            Reset
          </button>
          <label className="text-sm text-[var(--c-text2)]">Speed: {speed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-40"
          />
          <button
            onClick={() => setMode((current) => (current === "scheduledTime" ? "actualTime" : "scheduledTime"))}
            className="rounded-lg border border-[var(--c-border2)] px-3 py-2 text-sm text-[var(--c-text2)] transition-all duration-150 ease-out hover:bg-[var(--c-navy4)]"
          >
            Mode: {mode === "scheduledTime" ? "Scheduled" : "Actual"}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-3">
          {buses.map((bus) => (
            <label key={bus.busId} className="inline-flex items-center gap-2 text-sm text-[var(--c-text2)]">
              <input type="checkbox" checked={selectedBusIds.includes(bus.busId)} onChange={() => toggleBus(bus.busId)} />
              {bus.name}
            </label>
          ))}
        </div>
        <div className="h-[420px]">
          <Line data={chartData} options={options} />
        </div>
      </div>
      <aside className="rounded-[18px] border border-[var(--c-border)] bg-[var(--c-navy2)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
        <h3 className="mb-3 text-lg font-semibold text-[var(--c-text)]">Live overtake log</h3>
        <div className="space-y-2">
          {liveLog.length === 0 && <p className="text-sm text-[var(--c-text3)]">No overtake events yet.</p>}
          {liveLog.map((event) => (
            <p key={event.id} className="rounded-lg border border-[color:rgba(240,165,0,0.18)] bg-[color:rgba(240,165,0,0.08)] px-3 py-2 text-sm text-[var(--c-amber)]">
              {event.label}
            </p>
          ))}
        </div>
      </aside>
    </section>
  );
}
