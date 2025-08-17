import { isServerUp } from "../utils/serverHealth.js";
import dotenv from "dotenv";
dotenv.config();
import * as readline from "readline";
import { Logger } from "../utils/logger.js";
import { getConditionLabel } from "../utils/weatherCodes.js";

// Client reads the service URL from environment
const WEATHER_SERVICE_URL =
  process.env.WEATHER_SERVICE_URL || "http://localhost:3001";

const logger = new Logger("WeatherClient", "weather-client.log");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const printHelp = () => {
  console.log("\n🌤️ Weather Client Commands:");
  console.log("-------------------------");
  console.log("🌡️  weather <city>     - Get current weather");
  console.log("📅 forecast <city>    - Get 5-day forecast");
  console.log("📋 logs              - View server logs");
  console.log("❓ help              - Show this help message");
  console.log("👋 quit              - Exit the program\n");
};

async function getCurrentWeather(city: string) {
  const resp = await fetch(
    `${WEATHER_SERVICE_URL}/current?city=${encodeURIComponent(city)}`
  );
  if (!resp.ok) throw new Error(`Service error: ${resp.status}`);
  return await resp.json();
}

async function getForecast(city: string) {
  const resp = await fetch(
    `${WEATHER_SERVICE_URL}/forecast?city=${encodeURIComponent(city)}`
  );
  if (!resp.ok) throw new Error(`Service error: ${resp.status}`);
  return await resp.json();
}

// helper: print forecast as aligned table
// getConditionLabel is imported from utils/weatherCodes

const printForecastTable = (source: string, fdata: any) => {
  const colDate = 12;
  const colMin = 9;
  const colMax = 9;
  const colCond = 28;
  const pad = (s: any, w: number, align: "left" | "right" = "left") =>
    align === "left" ? String(s).padEnd(w) : String(s).padStart(w);

  console.log("\n📅 5-Day Forecast:");
  console.log(
    `${pad("Date", colDate)} | ${pad("Min(°C)", colMin, "right")} | ${pad(
      "Max(°C)",
      colMax,
      "right"
    )} | ${pad("Conditions", colCond)}`
  );
  console.log(
    `${"-".repeat(colDate)}-|-${"-".repeat(colMin)}-|-${"-".repeat(colMax)}-|-${
      "-".repeat(colCond)
    }`
  );

  if (source === "weatherApi") {
    const f = fdata as any;
    if (f && Array.isArray(f) && f.length > 0 && f[0].date) {
      // normalized array
      (f as any[]).forEach((day) => {
  const date = day.date ?? "-";
  const min = day.temperature?.min ?? "N/A";
  const max = day.temperature?.max ?? "N/A";
  const cond = getConditionLabel(day.conditions ?? "-").slice(0, colCond);
        console.log(
          `${pad(date, colDate)} | ${pad(min, colMin, "right")} | ${pad(
            max,
            colMax,
            "right"
          )} | ${pad(cond, colCond)}`
        );
      });
    } else if (f && f.time && f.temperature_2m_max) {
      // raw Open-Meteo shape
      for (let i = 0; i < f.time.length; i++) {
        const date = f.time[i] ?? "-";
        const min = f.temperature_2m_min?.[i] ?? "N/A";
        const max = f.temperature_2m_max?.[i] ?? "N/A";
        const cond = getConditionLabel((f.weathercode && f.weathercode[i]) ?? "-");
        console.log(
          `${pad(date, colDate)} | ${pad(min, colMin, "right")} | ${pad(
            max,
            colMax,
            "right"
          )} | ${pad(cond, colCond)}`
        );
      }
    } else {
      console.log("No forecast data available from API");
    }
  } else {
    // mock data
    (fdata as any[]).forEach((day: any) => {
  const date = day.date ?? "-";
  const min = day.temperature?.min ?? "N/A";
  const max = day.temperature?.max ?? "N/A";
  const cond = getConditionLabel(day.conditions ?? "-").slice(0, colCond);
      console.log(
        `${pad(date, colDate)} | ${pad(min, colMin, "right")} | ${pad(
          max,
          colMax,
          "right"
        )} | ${pad(cond, colCond)}`
      );
    });
  }
};

async function main() {
  console.log("\n🌤️ Welcome to Interactive Weather Client!");
  printHelp();

  rl.on("line", async (input) => {
    if (input.toLowerCase() === "quit") {
      console.log("👋 Goodbye!");
      await logger.log("Client session ended", "CLIENT");
      rl.close();
      process.exit(0);
    }

    const [command, ...args] = input.split(" ");
    let city = args.join(" ").trim();
    // Allow natural language like "weather in Spain" or "weather at Tokyo"
    if (/^(in|at)\b/i.test(city)) {
      city = city.replace(/^(in|at)\s+/i, "").trim();
    }

    // Health check before commands except help/logs
    if (!["help", "logs", ""].includes(command.toLowerCase())) {
      // Check the single service
      const serverUp = await isServerUp(WEATHER_SERVICE_URL);
      if (!serverUp) {
        console.log(
          "❌ Weather server is not running. Please start the server and try again."
        );
        console.log('\n🌤️ Enter a command (or "help" for commands):');
        return;
      }
    }

    try {
      switch (command.toLowerCase()) {
        case "weather": {
          if (!city) {
            console.log("❌ Please provide a city name");
            await logger.log(
              "Error: No city provided for weather command",
              "ERROR"
            );
            break;
          }
          // Health check already performed above
          const weatherResp = await getCurrentWeather(city);
          const source = weatherResp.source || "unknown";
          const w = weatherResp.data || {};
          if (source === "weatherApi") {
            console.log("\n🌡️ Current Weather (API):");
          } else {
            console.log(
              "\n🌡️ Current Weather: Results from Mock data (not Real)"
            );
            if (weatherResp.note) console.log(`  Note: ${weatherResp.note}`);
          }
          console.log("----------------");
          console.log(`  City: ${w.city || city}`);
          console.log(`  Temperature: ${w.temperature ?? w.temp ?? "N/A"}°C`);
          console.log(`  Windspeed: ${w.windspeed || w.windSpeed || "N/A"}`);
          console.log(
            `  Conditions: ${getConditionLabel(w.conditions ?? w.weathercode)}`
          );
          if (source === "weatherMock" && w.humidity !== undefined)
            console.log(`  Humidity: ${w.humidity}%`);
          await logger.log(
            `Successfully retrieved weather for ${city} (source=${source})`,
            "CLIENT"
          );
          break;
        }
        case "forecast": {
          if (!city) {
            console.log("❌ Please provide a city name");
            await logger.log(
              "Error: No city provided for forecast command",
              "ERROR"
            );
            break;
          }
          // Health check already performed above
          const forecastResp = await getForecast(city);
          const fsource = forecastResp.source || "unknown";
          const fdata = forecastResp.data || [];
          // Print forecast as a table: one record per row
          printForecastTable(fsource, fdata);
          await logger.log(
            `Successfully retrieved forecast for ${city} (source=${fsource})`,
            "CLIENT"
          );
          break;
        }

        case "logs":
          try {
            // Prefer mock logs if API doesn't provide the same endpoint
            const response = await fetch(`${WEATHER_SERVICE_URL}/logs`);
            if (!response.ok)
              throw new Error(`HTTP error! status: ${response.status}`);
            const logs = await response.text();
            console.log("\n📋 Weather Server Logs:");
            console.log("-------------------");
            console.log(logs || "No logs available");
          } catch (error: any) {
            console.error("❌ Could not read logs:", error.message);
          }
          break;

        case "help":
          printHelp();
          break;

        default:
          console.log(
            '❌ Unknown command. Type "help" to see available commands'
          );
      }
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }

    console.log('\n🌤️ Enter a command (or "help" for commands):');
  });
}

main().catch(console.error);
