# SL Transit Tracker

Production-style portfolio project that unifies Sri Lanka intercity bus timetable data and visualises overtakes with an animated time-space simulation.

## Screenshots

| Home search | Results + timetable | Overtake simulator |
|---|---|---|
| ![Home](docs/screenshots/home.png) | ![Timetable](docs/screenshots/timetable.png) | ![Simulator](docs/screenshots/simulator.png) |

## Motivation

Most Sri Lankan bus timetable information is fragmented. This app demonstrates how structured journey data can power:
- Searchable intercity route timetables
- Scheduled vs actual delay analysis
- Animated overtake insights for operations storytelling
- Live map showing bus positions interpolated from timetable data

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Chart.js, react-leaflet |
| Backend | Node.js, Express, Swagger UI (OpenAPI 3.0) |
| Data | Flat JSON files |
| Deploy | Vercel (frontend), Render (backend) |

## Local Setup

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at `http://localhost:4000`.  
API docs (Swagger): `http://localhost:4000/api-docs`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (or `5174` if 5173 is in use).

To connect to a hosted backend, set:

```bash
VITE_API_URL=https://your-render-backend-url
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/routes/:routeId/timetable` | Full timetable for a route |
| GET | `/api/routes/:routeId/overtakes` | All computed overtake events |
| GET | `/api/actual/:routeId` | Real recorded journeys for a route |
| GET | `/routes` | Legacy route list |
| GET | `/health` | Server health check |

## Pages

| URL | Description |
|---|---|
| `/` | Home — route search |
| `/results?from=Colombo&to=Jaffna` | Timetable + Scheduled vs Actual + Chart |
| `/simulate` | Full overtake simulator with time-space chart and live map |

## Adding Real Journey Data

Create a file in `backend/data/actual/` named `actual-<routeId>-YYYY-MM-DD.json`:

```json
{
  "date": "2026-04-14",
  "routeId": "bus-colombo-jaffna-2026-04-16",
  "vehicleId": "RATHNA_TRAVELS_MORNING_1",
  "stops": [
    { "name": "Colombo Fort", "scheduledTime": "06:00", "actualTime": "06:07" },
    { "name": "Jaffna",       "scheduledTime": "13:55", "actualTime": "14:09" }
  ],
  "notes": "Heavy traffic after Puttalam"
}
```

Actual data automatically appears in the Results page as a **Scheduled vs Actual** comparison table and as a dashed overlay line on the time-space chart.

## Suggested Git Commit Structure

1. `feat(backend): scaffold express api and swagger docs`
2. `feat(data): add colombo-jaffna routes and bus journey datasets`
3. `feat(frontend): implement search, timetable and chart simulator`
4. `feat(simulator): km-based overtake calculator + time-space diagram`
5. `feat(map): leaflet live map with bus position interpolation`
6. `feat(actual): scheduled vs actual journey comparison`
7. `docs(readme): add setup guide, api reference and screenshots`

## Future Roadmap

- Live GPS-based bus position streaming
- Crowdsourced passenger delay updates
- Additional routes (Colombo–Kandy, Colombo–Galle)
- Native mobile app companion
