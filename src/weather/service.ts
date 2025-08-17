import * as http from "http";
import * as url from "url";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
import { getMockCurrent, getMockForecast, getMockLogs } from "./mockData.js";
import {
  getLatLon,
  fetchCurrent,
  fetchForecast,
  getApiLogs,
} from "./apiServices.js";

// Embedding mock data in this single server; no separate mock process required
const PORT = Number(process.env.PORT) || 3001; // single server lives on 3001

async function fetchWithTimeout(
  urlStr: string,
  timeoutMs = 3000
): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(urlStr, { signal: controller.signal } as any);
    return resp;
  } finally {
    clearTimeout(id);
  }
}

type AsyncFetcher = () => Promise<any>;

async function tryWithRetries(
  pathOrFn: string | AsyncFetcher,
  attempts = 3,
  timeoutMs = 3000
) {
  let lastErr: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      if (typeof pathOrFn === "string") {
        const resp = await fetchWithTimeout(pathOrFn, timeoutMs);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return data;
      } else {
        // call the provided async function directly
        const data = await pathOrFn();
        return data;
      }
    } catch (err: any) {
      lastErr = err;
      // log attempt failure for diagnostics
      console.error(
        `tryWithRetries attempt ${i + 1} failed:`,
        err && err.message ? err.message : String(err)
      );
      // small backoff
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw lastErr;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || "", true);

  if (parsed.pathname === "/current" || parsed.pathname === "/forecast") {
  const rawCity = (parsed.query.city as string) || '';
  // sanitize common natural-language prefixes (e.g. "in Spain", "at Tokyo")
  const city = rawCity.replace(/^\s*(in|at|near|in the)\b\s*/i, '').trim();
    if (!city) {
      res.writeHead(400);
      res.end("City parameter is required");
      return;
    }
    try {
      // quick geocode check to fail fast when city is not found (avoid retrying on 'City not found')
      // Log raw vs sanitized to aid debugging of user input like "weather in Spain"
      console.debug(`service: geocode request raw='${rawCity}' sanitized='${city}'`);
      let coords: { lat: number; lon: number } | null = null;
      try {
        coords = await getLatLon(city);
      } catch (e) {
        // network/geocode error — let the retry logic handle it below
        coords = null;
      }
      if (!coords) {
        // Geocoding returned nothing — instead of returning 404 to the client
        // we treat this as an upstream miss and return mock data so the client
        // still receives a result (preserves UX). Log for diagnostics.
        console.info(
          `service: geocode miss for '${city}', returning mock data`
        );
        const data =
          parsed.pathname === "/current"
            ? getMockCurrent(city)
            : getMockForecast(city);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            source: "weatherMock",
            note: "Unable to Get Real data as of now — This is Mock data not real",
            data,
          })
        );
        return;
      }

      try {
        const raw =
          parsed.pathname === "/current"
            ? await tryWithRetries(
                (() => fetchCurrent(city)) as AsyncFetcher,
                3,
                3000
              )
            : await tryWithRetries(
                (() => fetchForecast(city)) as AsyncFetcher,
                3,
                3000
              );
        const data =
          parsed.pathname === "/current"
            ? normalizeApiCurrent(raw)
            : normalizeApiForecast(raw);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ source: "weatherApi", data }));
        return;
      } catch (apiErr: any) {
        // API failed after retries, log and fallback to mock data functions
        console.error(
          "API failed after retries, falling back to mock. Error:",
          apiErr && apiErr.message ? apiErr.message : String(apiErr)
        );
        const data =
          parsed.pathname === "/current"
            ? getMockCurrent(city)
            : getMockForecast(city);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            source: "weatherMock",
            note: "Unable to Get Real data as of now — This is Mock data not real",
            data,
          })
        );
        return;
      }
    } catch (err: any) {
      res.writeHead(500);
      res.end(`Error: ${err.message}`);
      return;
    }
  }

  // Health endpoint for client health checks
  if (parsed.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "weather-service",
        port: Number(PORT),
      })
    );
    return;
  }

  if (parsed.pathname === "/logs") {
    try {
      const logs = await getApiLogs().catch(() => null);
      if (logs) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(logs);
        return;
      }
      // fallback to mock data logs function
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(getMockLogs());
      return;
    } catch (err: any) {
      res.writeHead(500);
      res.end(
        `Error reading logs: ${err && err.message ? err.message : String(err)}`
      );
      return;
    }
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(Number(PORT), () => {
  console.log(`Weather Service running at http://localhost:${PORT}`);
  console.log(
    "- GET  /current?city=<cityname>    - Returns { source, note?, data }"
  );
  console.log(
    "- GET  /forecast?city=<cityname>   - Returns { source, note?, data }"
  );
  console.log(
    "- GET  /logs                       - Returns logs from API or mock"
  );
});

// Normalize API responses (Open-Meteo shape -> common shape)
function normalizeApiCurrent(raw: any) {
  const cw = raw.current_weather || raw;
  return {
    city: raw.city || cw?.city || "Unknown",
    temperature: cw?.temperature ?? cw?.temp ?? null,
    windSpeed: cw?.windspeed ?? cw?.windSpeed ?? null,
    windDirection: cw?.winddirection ?? null,
    conditions:
      cw?.conditions ??
      (cw?.weathercode != null ? `code:${cw.weathercode}` : null),
    time: cw?.time ?? null,
  };
}

function normalizeApiForecast(raw: any) {
  const daily = raw.daily || raw;
  const times = daily.time || daily?.time || [];
  const maxs = daily.temperature_2m_max || [];
  const mins = daily.temperature_2m_min || [];
  const codes = daily.weathercode || [];
  const out: any[] = [];
  for (let i = 0; i < times.length; i++) {
    out.push({
      date: times[i],
      temperature: { min: mins[i] ?? null, max: maxs[i] ?? null },
      conditions: codes[i] != null ? `code:${codes[i]}` : null,
    });
  }
  return out;
}
