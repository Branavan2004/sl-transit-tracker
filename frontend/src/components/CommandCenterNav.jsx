import { Link } from "react-router-dom";

const tabs = [
  { id: "timetable", label: "Timetable" },
  { id: "simulator", label: "Overtake simulator" },
  { id: "map", label: "Live map" },
];

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4.75h10c1.38 0 2.5 1.12 2.5 2.5v7.5c0 1.38-1.12 2.5-2.5 2.5H7c-1.38 0-2.5-1.12-2.5-2.5v-7.5c0-1.38 1.12-2.5 2.5-2.5Z" />
      <path d="M6.5 9.25h11" />
      <path d="M9 17.25v2" />
      <path d="M15 17.25v2" />
      <circle cx="8.75" cy="14.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.25" cy="14.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function hrefFor(tabId, timetableHref) {
  if (tabId === "timetable") return timetableHref;
  if (tabId === "map") return "/simulate?tab=map";
  return "/simulate";
}

export default function CommandCenterNav({
  activeTab = null,
  routeLabel = "Colombo → Jaffna",
  timetableHref = "/results?from=Colombo&to=Jaffna",
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[color:rgba(12,21,37,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-3 transition-all duration-150 ease-out hover:opacity-90">
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[var(--c-red)] text-white">
            <BusIcon />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold text-[var(--c-text)]">SL Transit</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.28em] text-[var(--c-text3)]">TRACKER</span>
          </span>
        </Link>

        <nav className="mx-auto flex min-w-0 flex-1 items-center justify-center overflow-x-auto">
          <div className="flex items-center gap-1 whitespace-nowrap rounded-xl bg-transparent p-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={hrefFor(tab.id, timetableHref)}
                  className={`rounded-md px-4 py-2 text-[13px] font-semibold transition-all duration-150 ease-out ${
                    isActive
                      ? "border-b-2 border-[var(--c-teal)] text-[var(--c-teal)]"
                      : "text-[var(--c-text2)] hover:bg-[var(--c-navy4)]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex items-center gap-2 rounded-full border border-[color:rgba(15,207,170,0.25)] bg-[color:rgba(15,207,170,0.07)] px-2.5 py-1">
            <span className="live-dot h-2 w-2 rounded-full bg-[var(--c-teal)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--c-teal)]">LIVE</span>
          </div>
          <div className="rounded-full bg-[var(--c-navy3)] px-3 py-1 text-[12px] text-[var(--c-text2)]">
            {routeLabel}
          </div>
        </div>
      </div>
    </header>
  );
}
