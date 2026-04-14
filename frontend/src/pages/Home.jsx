// Presents project hero content and route search inputs.
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";

export default function Home() {
  const navigate = useNavigate();

  const handleSearch = useCallback(
    ({ from, to }) => {
      const params = new URLSearchParams({ from, to });
      navigate(`/results?${params.toString()}`);
    },
    [navigate]
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-2xl bg-gradient-to-r from-teal-700 to-cyan-600 p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold">SL Transit Tracker</h1>
          <p className="mt-3 max-w-2xl text-sm text-teal-50">
            Explore Colombo to Jaffna journey behavior with a production-style timetable and time-space overtake simulation based on real journey logs.
          </p>
        </div>
        <SearchBar onSearch={handleSearch} />
      </section>
    </main>
  );
}
