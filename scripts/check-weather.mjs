import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const SERVICE_URL = process.env.WEATHER_SERVICE_URL || "http://localhost:3001";
const GEO_API_BASE =
  process.env.GEO_API_BASE || "https://geocoding-api.open-meteo.com/v1";
const WEATHER_API_BASE =
  process.env.WEATHER_API_BASE || "https://api.open-meteo.com/v1";

function short(obj, full = false) {
  try {
    const s = JSON.stringify(obj, null, 2);
    return full ? s : s.slice(0, 1000);
  } catch {
    return String(obj);
  }
}

async function testService(city) {
  console.log(
    `\n== Testing local service at ${SERVICE_URL} for city='${city}' ==`
  );
  try {
    const h = await fetch(`${SERVICE_URL}/health`);
    console.log("/health ->", h.status, h.ok ? "OK" : "NOT OK");
  } catch (e) {
    console.log("/health -> Error:", e.message);
  }

  try {
    const cur = await fetch(
      `${SERVICE_URL}/current?city=${encodeURIComponent(city)}`
    );
    console.log("/current ->", cur.status);
    const data = await cur.text();
    console.log("  body preview:", data.slice(0, 1000));
  } catch (e) {
    console.log("/current -> Error:", e.message);
  }

  try {
    const f = await fetch(
      `${SERVICE_URL}/forecast?city=${encodeURIComponent(city)}`
    );
    console.log("/forecast ->", f.status);
    const data = await f.text();
    console.log("  body preview:", data.slice(0, 1000));
  } catch (e) {
    console.log("/forecast -> Error:", e.message);
  }
}

async function testUpstreamApi(city, full = false) {
  console.log(`\n== Testing upstream Open-Meteo API for city='${city}' ==`);
  try {
    const geoUrl = `${GEO_API_BASE}/search?name=${encodeURIComponent(
      city
    )}&count=1`;
    const g = await fetch(geoUrl);
    console.log("Geocoding ->", g.status);
    const gJson = await g.json();
    console.log(
      "  results:",
      gJson.results && gJson.results.length
        ? `${gJson.results.length} result(s)`
        : "no results"
    );
    if (gJson.results && gJson.results.length) {
      const lat = gJson.results[0].latitude;
      const lon = gJson.results[0].longitude;
      console.log(`  lat=${lat} lon=${lon}`);

      const forecastUrl = `${WEATHER_API_BASE}/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=5&timezone=auto`;
      const fw = await fetch(forecastUrl);
      console.log("Forecast ->", fw.status);
      const fwJson = await fw.json();
      console.log("  sample:", short(fwJson, full));
    }
  } catch (e) {
    console.log("Upstream API Error:", e.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const city = args[0] || "London";
  // Default: test the external API. Pass 'service' to test the local service instead/additionally.
  const runService = args.includes("service");
  const runApi = !args.includes("service");

  const full = args.includes("full");
  if (runService) await testService(city);
  if (runApi) await testUpstreamApi(city, full);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
