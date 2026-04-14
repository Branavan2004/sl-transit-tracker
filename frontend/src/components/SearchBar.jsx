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
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl bg-white p-6 shadow-md md:grid-cols-3">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">From</label>
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">To</label>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
          {toOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="self-end rounded-lg bg-brand px-4 py-2 font-semibold text-white transition hover:bg-teal-700">
        Search
      </button>
    </form>
  );
}
