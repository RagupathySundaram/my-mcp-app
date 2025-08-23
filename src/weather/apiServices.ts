import "dotenv/config";
import fetch from "node-fetch";

const GEO_API_BASE =
  process.env["GEO_API_BASE"] || "https://geocoding-api.open-meteo.com/v1";
const WEATHER_API_BASE =
  process.env["WEATHER_API_BASE"] || "https://api.open-meteo.com/v1";
// Default to a snappier timeout to avoid long hangs; can be overridden via env
const API_TIMEOUT_MS = Number(process.env["API_TIMEOUT_MS"]) || 1500;
const ALLOW_ALT_GEOCODE = process.env["WEATHER_GEOCODE_ALT"] === "1";

async function fetchWithTimeout(url: string, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal } as any);
    return resp;
  } finally {
    clearTimeout(id);
  }
}

export async function getLatLon(
  city: string
): Promise<{ lat: number; lon: number } | null> {
  if (!city || !city.trim()) return null;
  const q = encodeURIComponent(city.trim());
  const url = `${GEO_API_BASE}/search?name=${q}&count=1`;
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) throw new Error(`Geocoding HTTP ${resp.status}`);
    const data = (await resp.json()) as any;
    if (data.results && data.results.length > 0) {
      return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
  } catch (err) {
    console.error(
      `apiServices.getLatLon: fetch failed for ${url}:`,
      (err as any)?.message || err
    );
  }

  // broader attempt (optional)
  if (ALLOW_ALT_GEOCODE) {
    try {
      const alt = `${GEO_API_BASE}/search?name=${q}&count=10`;
      const resp2 = await fetchWithTimeout(alt);
      if (resp2 && resp2.ok) {
        const data2 = (await resp2.json()) as any;
        if (data2.results && data2.results.length > 0) {
          return {
            lat: data2.results[0].latitude,
            lon: data2.results[0].longitude,
          };
        }
      }
      const alt2 = `${GEO_API_BASE}/search?name=${q}&language=en&count=10`;
      const resp3 = await fetchWithTimeout(alt2);
      if (resp3 && resp3.ok) {
        const data3 = (await resp3.json()) as any;
        if (data3.results && data3.results.length > 0) {
          return {
            lat: data3.results[0].latitude,
            lon: data3.results[0].longitude,
          };
        }
      }
    } catch (err) {
      console.error(
        `apiServices.getLatLon: secondary fetch failed for ${city}:`,
        (err as any)?.message || err
      );
    }
  }

  console.error(`apiServices.getLatLon: no geocoding results for '${city}'`);
  return null;
}

export async function fetchCurrent(city: string): Promise<any> {
  const coords = await getLatLon(city);
  if (!coords) throw new Error("City not found");
  const url = `${WEATHER_API_BASE}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`Weather HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchForecast(city: string): Promise<any> {
  const coords = await getLatLon(city);
  if (!coords) throw new Error("City not found");
  const url = `${WEATHER_API_BASE}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=5&timezone=auto`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`Forecast HTTP ${resp.status}`);
  return resp.json();
}

export async function getApiLogs(): Promise<string> {
  return "No API logs available (apiServices module)";
}
