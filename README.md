# SL Transit Tracker

Production-style portfolio project that unifies Sri Lanka intercity bus timetable data and visualizes overtakes with a time-space simulation.

## Motivation

Most Sri Lankan bus timetable information is fragmented. This app demonstrates how structured journey data can power:
- searchable intercity route timetables,
- delay-aware stop analysis,
- and animated overtake insights for operations storytelling.


## Tech Stack

- Frontend: React 18, Tailwind CSS, Chart.js
- Backend: Node.js, Express, Swagger UI (OpenAPI 3.0)
- Data storage: JSON flat files
- Deploy target: Vercel (frontend), Render (backend)

## Local Setup

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at `http://localhost:4000` and API docs at `http://localhost:4000/api-docs`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

To connect to a hosted backend, set:

```bash
VITE_API_URL=https://your-render-backend-url
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/routes` | List all available routes |
| GET | `/routes/:id/buses` | Get all buses for a route with stop data |
| GET | `/buses/:id` | Get one bus with full stop-by-stop data |

## Add New Bus Data

1. Open `backend/data/buses.json`.
2. Add a new bus object with:
   - `busId`, `name`, `type`, `route`, `routeId`,
   - `stops[]` entries containing `name`, `km`, `scheduledTime`, `actualTime`.
3. Ensure `routeId` matches an entry in `backend/data/routes.json`.
4. Restart backend and refresh frontend.

## Suggested Git Commit Structure

1. `feat(backend): scaffold express api and swagger docs`
2. `feat(data): add colombo-jaffna routes and bus journey datasets`
3. `feat(frontend): implement search, timetable and chart simulator`
4. `docs(readme): add setup guide, api reference and roadmap`

## Future Roadmap

- Live GPS-based bus position streaming
- Crowdsourced passenger delay updates
- Native mobile app companion
