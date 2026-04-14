// Centralizes all API calls and loading/error state for route and bus data.
import { useCallback, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function useBuses() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const request = useCallback(async (path) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}${path}`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      setError(err.message || "Failed to fetch data.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoutes = useCallback(() => request("/routes"), [request]);
  const fetchBusesByRoute = useCallback((routeId) => request(`/routes/${routeId}/buses`), [request]);
  const fetchBusById = useCallback((busId) => request(`/buses/${busId}`), [request]);

  return {
    loading,
    error,
    fetchRoutes,
    fetchBusesByRoute,
    fetchBusById
  };
}
