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

function detectOvertakes(buses, mode) {
  const events = [];
  for (let i = 0; i < buses.length; i += 1) {
    for (let j = i + 1; j < buses.length; j += 1) {
      const a = buses[i].stops;
      const b = buses[j].stops;
      for (let k = 0; k < Math.min(a.length, b.length) - 1; k += 1) {
        const a1 = parseTime(a[k][mode]);
        const a2 = parseTime(a[k + 1][mode]);
        const b1 = parseTime(b[k][mode]);
        const b2 = parseTime(b[k + 1][mode]);
        const d1 = a1 - b1;
        const d2 = a2 - b2;
        if (d1 === 0 || d2 === 0 || d1 * d2 > 0) {
          continue;
        }
        const ratio = Math.abs(d1) / (Math.abs(d1) + Math.abs(d2));
        const x = a1 + ratio * (a2 - a1);
        const y = a[k].km + ratio * (a[k + 1].km - a[k].km);
        const stopLabel = `${a[k].name} (${Math.round(y)}km)`;
        const leadBus = d1 > 0 ? buses[j] : buses[i];
        const passBus = d1 > 0 ? buses[i] : buses[j];
        events.push({
          id: `${buses[i].busId}-${buses[j].busId}-${k}`,
          x,
          y,
          label: `${passBus.name} overtook ${leadBus.name} at ${stopLabel}`
        });
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
      <div className="rounded-xl bg-white p-4 shadow-md">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button onClick={() => setIsPlaying((value) => !value)} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button onClick={() => setProgress(minTime)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Reset
          </button>
          <label className="text-sm">Speed: {speed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-40"
          />
          <button onClick={() => setMode((current) => (current === "scheduledTime" ? "actualTime" : "scheduledTime"))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Mode: {mode === "scheduledTime" ? "Scheduled" : "Actual"}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-3">
          {buses.map((bus) => (
            <label key={bus.busId} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedBusIds.includes(bus.busId)} onChange={() => toggleBus(bus.busId)} />
              {bus.name}
            </label>
          ))}
        </div>
        <div className="h-[420px]">
          <Line data={chartData} options={options} />
        </div>
      </div>
      <aside className="rounded-xl bg-white p-4 shadow-md">
        <h3 className="mb-3 text-lg font-semibold">Live overtake log</h3>
        <div className="space-y-2">
          {liveLog.length === 0 && <p className="text-sm text-slate-500">No overtake events yet.</p>}
          {liveLog.map((event) => (
            <p key={event.id} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {event.label}
            </p>
          ))}
        </div>
      </aside>
    </section>
  );
}
