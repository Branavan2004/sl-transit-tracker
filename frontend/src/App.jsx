// Defines top-level routes for home, search results, and overtake simulator pages.
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Results from "./pages/Results";
import SimulatorLayout from "./pages/SimulatorLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/results" element={<Results />} />
      <Route path="/simulate" element={<SimulatorLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
