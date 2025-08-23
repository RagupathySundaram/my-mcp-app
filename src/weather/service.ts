import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getMockCurrent, getMockForecast, getMockLogs } from "./mockData.js";
import { fetchCurrent, fetchForecast, getApiLogs } from "./apiServices.js";
import { Logger } from "../utils/logger.js";
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import { getConditionLabel } from "../utils/weatherCodes.js";

// Synchronous fallback logger file used when running as a child process.
const syncLogFile = path.join("logs", "service-child.log");
function syncLog(message: string) {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const entry = `[${timestamp}] [ERROR] [WeatherService] ${message} (${now.toLocaleString()})\n`;
    try {
      fs.mkdirSync(path.dirname(syncLogFile), { recursive: true });
    } catch {}
    fs.appendFileSync(syncLogFile, entry, { encoding: "utf8" });
  } catch {}
}

const withApiRetry = async <T>(
  fn: () => Promise<T>,
  fallback: () => T,
  note: string
): Promise<T> => {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
    }
  }
  const result = fallback();
  if (typeof result === "object" && result !== null) {
    (result as any).note = note;
  }
  return result;
};
export function registerWeatherTools(server: McpServer) {
  server.registerTool(
    "current",
    {
      inputSchema: {
        city: z.string().describe("City name"),
      },
    },
    async ({ city }: { city: string }) => {
      if (!city) throw new Error("City parameter is required");
      const sanitized = city.replace(/^(in|at|near|in the)\b\s*/i, "").trim();
      let apiResult;
      try {
        apiResult = await withApiRetry(
          async () => {
            const data = await fetchCurrent(sanitized);
            return { source: "api", data };
          },
          () => {
            throw new Error("API failed after retries");
          },
          "No real data, this is a Mock Response"
        );
      } catch (e) {
        apiResult = {
          source: "mock",
          note: "No real data, this is a Mock Response",
          data: getMockCurrent(sanitized),
        };
      }
      // Build a friendly text summary
      let text: string;
      if (apiResult.source === "api" && apiResult.data?.current_weather) {
        const cw = apiResult.data.current_weather;
        const units = apiResult.data.current_weather_units || {};
        const cond = getConditionLabel(cw.weathercode);
        const isDay = cw.is_day ? "Day" : "Night";
        text = [
          `Weather - ${sanitized}`,
          `Time: ${cw.time} (${isDay})`,
          `Temperature: ${cw.temperature}${units.temperature || "°C"}`,
          `Condition: ${cond}`,
          `Wind: ${cw.windspeed}${units.windspeed || " km/h"} @ ${
            cw.winddirection
          }°`,
        ].join("\n");
      } else if (apiResult.source === "mock") {
        const d = apiResult.data;
        text = [
          `Weather - ${sanitized} (Mock)`,
          `Temperature: ${d.temperature}°C`,
          `Condition: ${d.conditions}`,
          `Humidity: ${d.humidity}%`,
          `Wind: ${d.windSpeed} km/h`,
        ].join("\n");
      } else {
        text = `Weather - ${sanitized}: unavailable`;
      }
      if ((apiResult as any).note) {
        text += `\nNote: ${(apiResult as any).note}`;
      }
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "forecast",
    {
      description:
        "📅 Get 5-day forecast (service). Returns { source, note?, data }",
      inputSchema: {
        city: z.string().describe("City name"),
      },
    },
    async ({ city }: { city: string }) => {
      if (!city) throw new Error("City parameter is required");
      const sanitized = city.replace(/^(in|at|near|in the)\b\s*/i, "").trim();
      let apiResult;
      try {
        apiResult = await withApiRetry(
          async () => {
            const data = await fetchForecast(sanitized);
            return { source: "api", data };
          },
          () => {
            throw new Error("API failed after retries");
          },
          "No real data, this is a Mock Response"
        );
      } catch (e) {
        apiResult = {
          source: "mock",
          note: "No real data, this is a Mock Response",
          data: getMockForecast(sanitized),
        };
      }
      // Build a friendly 5-day forecast summary
      let lines: string[] = [];
      if (apiResult.source === "api" && apiResult.data?.daily) {
        const d = apiResult.data.daily;
        const units = (apiResult.data as any).daily_units || {};
        const len = Math.min(
          d.time?.length || 0,
          d.temperature_2m_max?.length || 0,
          d.temperature_2m_min?.length || 0,
          d.weathercode?.length || 0
        );
        lines.push(`5-day Forecast - ${sanitized}`);
        for (let i = 0; i < len; i++) {
          const date = d.time[i];
          const tmax = d.temperature_2m_max[i];
          const tmin = d.temperature_2m_min[i];
          const cond = getConditionLabel(d.weathercode[i]);
          const unit = units.temperature_2m_max || "°C";
          lines.push(
            `${date}: min ${tmin}${
              units.temperature_2m_min || unit
            } / max ${tmax}${unit}, ${cond}`
          );
        }
      } else if (apiResult.source === "mock" && Array.isArray(apiResult.data)) {
        lines.push(`5-day Forecast - ${sanitized} (Mock)`);
        for (const day of apiResult.data) {
          lines.push(
            `${day.date}: min ${day.temperature.min}°C / max ${day.temperature.max}°C, ${day.conditions}`
          );
        }
      } else {
        lines.push(`5-day Forecast - ${sanitized}: unavailable`);
      }
      if ((apiResult as any).note) {
        lines.push(`Note: ${(apiResult as any).note}`);
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.registerTool(
    "logs",
    {
      description: "📋 View service logs",
      inputSchema: {},
    },
    async () => {
      const logs = await getApiLogs();
      return { content: [{ type: "text", text: logs }] };
    }
  );
}

// If this file is executed directly (node src/weather/service.js), create and
// start a standalone server. When imported, callers should use
// `registerWeatherTools(server)` to register the tools on their server.
const isDirect = (() => {
  try {
    const href = pathToFileURL(process.argv[1]).href;
    return import.meta.url === href;
  } catch {
    return false;
  }
})();
if (isDirect) {
  // Create child logging only for the standalone child process
  const childLogger = new Logger("WeatherService", "service-child.log");
  childLogger.log("Weather MCP server starting (stdio mode)").catch(() => {});

  process.on("uncaughtException", (err: any) => {
    try {
      console.error("Uncaught Exception:", err);
      childLogger
        .log(`uncaughtException: ${err && (err.stack || err)}`, "ERROR")
        .catch(() => {});
      try {
        syncLog(`uncaughtException: ${err && (err.stack || err)}`);
      } catch {}
    } finally {
      process.exit(1);
    }
  });

  process.on("unhandledRejection", (reason: any) => {
    console.error("Unhandled Rejection:", reason);
    childLogger
      .log(`unhandledRejection: ${JSON.stringify(reason)}`, "ERROR")
      .catch(() => {});
    try {
      syncLog(`unhandledRejection: ${JSON.stringify(reason)}`);
    } catch {}
  });

  process.on("exit", (code) => {
    childLogger.log(`Process exiting with code ${code}`).catch(() => {});
    try {
      syncLog(`Process exiting with code ${code}`);
    } catch {}
  });

  (async function main() {
    const server = new McpServer({
      name: "weatherService",
      version: "1.0.0",
      description: "Weather MCP Service",
    });
    registerWeatherTools(server);
    try {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    } catch (err: any) {
      console.error("Fatal error starting Weather MCP server:", err);
      try {
        syncLog(
          `Fatal error starting Weather MCP server: ${
            err && (err.stack || err)
          }`
        );
      } catch {}
      process.exit(1);
    }
  })();
}
