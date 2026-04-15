// Renders city selectors and forwards validated search values to the parent page.
import { useCallback, useMemo, useState } from "react";

const cities = [
  "Colombo",
  "Negombo",
  "Chilaw",
  "Puttalam",
  "Nochiyadiya",
  "Vavuniya",
  "Kilinochchi",
  "Elephant Pass",
  "Jaffna"
];

export default function SearchBar({ onSearch }) {
  const [from, setFrom] = useState("Colombo");
  const [to, setTo] = useState("Jaffna");

  const toOptions = useMemo(() => cities.filter((city) => city !== from), [from]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      onSearch({ from, to });
    },
    [from, to, onSearch]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-[20px] border border-[var(--c-border)] bg-[var(--c-navy2)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:grid-cols-[1fr_1fr_auto]"
    >
      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--c-text3)]">From</label>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded-xl border border-[var(--c-border2)] bg-[var(--c-navy3)] px-4 py-3 text-[var(--c-text)] outline-none transition-all duration-150 ease-out hover:border-[var(--c-teal2)] focus:border-[var(--c-teal)]"
        >
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--c-text3)]">To</label>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-xl border border-[var(--c-border2)] bg-[var(--c-navy3)] px-4 py-3 text-[var(--c-text)] outline-none transition-all duration-150 ease-out hover:border-[var(--c-teal2)] focus:border-[var(--c-teal)]"
        >
          {toOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="self-end rounded-xl bg-[var(--c-red)] px-5 py-3 text-[13px] font-semibold text-white transition-all duration-150 ease-out hover:bg-[var(--c-red2)] active:scale-[0.97]"
      >
        Open Timetable
      </button>
    </form>
  );
}
