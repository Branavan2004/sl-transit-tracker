// SimulatorContext.jsx — shared state for playback, vehicles, overtakes, and UI
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ROUTE_ID = "bus-colombo-jaffna-2026-04-16";

// ─── Helpers (exported for use in sibling components) ─────────────────────────
export function parseToMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toAbsoluteMinutes(stops, departureTime) {
  const dep = parseToMinutes(departureTime);
  return stops.map((s) => {
    let t = parseToMinutes(s.scheduledTime);
    if (t < dep) t += 1440;
    return t;
  });
}

export function minutesToHHmm(mins) {
  const wrapped = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const m = String(wrapped % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function labelFor(vehicleId) {
  if (!vehicleId) return "";
  return vehicleId.replace(/_/g, " ").slice(0, 20);
}

function generateColors(n) {
  return Array.from({ length: n }, (_, i) => {
    const hue = Math.round((i / n) * 330); // avoid wrapping back to red
    return `hsl(${hue}, 78%, 58%)`;
  });
}

// ─── Context ──────────────────────────────────────────────────────────────────
const SimulatorContext = createContext(null);

export function SimulatorProvider({ children }) {
  // Data
  const [vehicles, setVehicles] = useState([]);
  const [overtakes, setOvertakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Playback
  const [timelineMinutes, setTimelineMinutes] = useState(360);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(4);

  // UI state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [onlySelected, setOnlySelected] = useState(false);
  const [hoveredVehicleId, setHoveredVehicleId] = useState(null);
  const [flashedOvertake, setFlashedOvertake] = useState(null); // { event, expiresAt }
  const [xWindow, setXWindow] = useState(null); // { min, max } or null = auto

  // Pulse ticker for animations
  const [pulse, setPulse] = useState(0);

  const animRef = useRef(null);
  const pulseRef = useRef(null);
  const flashTimerRef = useRef(null);

  // ── Fetch ──
  useEffect(() => {
    async function load() {
      try {
        const [tmRes, ovRes] = await Promise.all([
          fetch(`${API_BASE}/api/routes/${ROUTE_ID}/timetable`),
          fetch(`${API_BASE}/api/routes/${ROUTE_ID}/overtakes`),
        ]);
        if (!tmRes.ok || !ovRes.ok) throw new Error("API error");
        const tmData = await tmRes.json();
        const ovData = await ovRes.json();
        const vs = tmData.vehicles || [];
        setVehicles(vs);
        setSelectedIds(new Set(vs.map((v) => v.vehicleId)));
        setOvertakes(ovData.overtakes || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Derived globals ──
  const { globalMin, globalMax } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    vehicles.forEach((v) => {
      const abs = toAbsoluteMinutes(v.stops, v.departureTime);
      mn = Math.min(mn, abs[0]);
      mx = Math.max(mx, abs[abs.length - 1]);
    });
    return { globalMin: mn === Infinity ? 360 : mn, globalMax: mx === -Infinity ? 1900 : mx };
  }, [vehicles]);

  // Sync timeline start once globalMin is known
  useEffect(() => {
    if (globalMin < Infinity) setTimelineMinutes(globalMin);
  }, [globalMin]);

  // Color map
  const colors = useMemo(() => generateColors(vehicles.length), [vehicles.length]);
  const colorMap = useMemo(() => {
    const m = {};
    vehicles.forEach((v, i) => { m[v.vehicleId] = colors[i]; });
    return m;
  }, [vehicles, colors]);

  // ── Stats ──
  const stats = useMemo(() => {
    if (!vehicles.length || !overtakes.length) return null;

    // Fastest bus: min (lastStop.abs - firstStop.abs) among vehicles reaching Jaffna
    let fastestId = null, fastestDur = Infinity;
    vehicles.forEach((v) => {
      const abs = toAbsoluteMinutes(v.stops, v.departureTime);
      const dur = abs[abs.length - 1] - abs[0];
      if (dur < fastestDur) { fastestDur = dur; fastestId = v.vehicleId; }
    });

    // Most overtakes made
    const madeCounts = {};
    overtakes.forEach((e) => {
      madeCounts[e.overtakingVehicle] = (madeCounts[e.overtakingVehicle] || 0) + 1;
    });
    const mostMadeId = Object.keys(madeCounts).sort((a, b) => madeCounts[b] - madeCounts[a])[0];

    // Most overtaken
    const overtakenCounts = {};
    overtakes.forEach((e) => {
      const victim = e.vehicleA === e.overtakingVehicle ? e.vehicleB : e.vehicleA;
      overtakenCounts[victim] = (overtakenCounts[victim] || 0) + 1;
    });
    const mostOvertakenId = Object.keys(overtakenCounts).sort((a, b) => overtakenCounts[b] - overtakenCounts[a])[0];

    return {
      fastestId,
      fastestDurMin: fastestDur,
      mostMadeId,
      mostMadeCount: madeCounts[mostMadeId] || 0,
      mostOvertakenId,
      mostOvertakenCount: overtakenCounts[mostOvertakenId] || 0,
    };
  }, [vehicles, overtakes]);

  // ── Playback ──
  useEffect(() => {
    if (isPlaying) {
      animRef.current = setInterval(() => {
        setTimelineMinutes((prev) => {
          const next = prev + playSpeed;
          if (next >= globalMax) { setIsPlaying(false); return globalMax; }
          return next;
        });
      }, 80);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [isPlaying, playSpeed, globalMax]);

  // ── Pulse ──
  useEffect(() => {
    pulseRef.current = setInterval(() => setPulse((p) => p + 0.15), 50);
    return () => clearInterval(pulseRef.current);
  }, []);

  // ── Flash overtake (click in log) ──
  const flashOvertakeEvent = useCallback((ev) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashedOvertake(ev);
    setTimelineMinutes(ev.atTimeMinutes);
    flashTimerRef.current = setTimeout(() => setFlashedOvertake(null), 2000);
  }, []);

  const toggleVehicle = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((vs) => {
    setSelectedIds((prev) =>
      prev.size === vs.length ? new Set() : new Set(vs.map((v) => v.vehicleId))
    );
  }, []);

  const resetPlayback = useCallback(() => {
    setTimelineMinutes(globalMin);
    setIsPlaying(false);
  }, [globalMin]);

  // ── Visible overtakes ──
  const visibleOvertakes = useMemo(() => {
    return overtakes.filter((e) => {
      const bothSelected = selectedIds.has(e.vehicleA) && selectedIds.has(e.vehicleB);
      if (onlySelected && !bothSelected) return false;
      if (!selectedIds.has(e.vehicleA) && !selectedIds.has(e.vehicleB)) return false;
      return e.atTimeMinutes <= timelineMinutes;
    });
  }, [overtakes, selectedIds, onlySelected, timelineMinutes]);

  return (
    <SimulatorContext.Provider value={{
      // Data
      vehicles, overtakes, loading, error,
      // Derived
      globalMin, globalMax, colorMap, stats, visibleOvertakes,
      // Playback
      timelineMinutes, setTimelineMinutes, isPlaying, setIsPlaying, playSpeed, setPlaySpeed,
      resetPlayback,
      // UI
      selectedIds, toggleVehicle, toggleAll, onlySelected, setOnlySelected,
      hoveredVehicleId, setHoveredVehicleId,
      flashedOvertake, flashOvertakeEvent,
      xWindow, setXWindow,
      pulse,
    }}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator must be used inside SimulatorProvider");
  return ctx;
}
