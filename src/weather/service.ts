import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getMockCurrent, getMockForecast, getMockLogs } from "./mockData.js";
import { fetchCurrent, fetchForecast } from "./apiServices.js";

import { getConditionLabel } from "../utils/weatherCodes.js";

// Helper to format current weather output
function formatCurrentWeather(apiResult: any, city: string): string {
  const lines: string[] = [];
  const apiDomain =
    process.env["WEATHER_API_BASE"] || "https://api.open-meteo.com";
  if (apiResult.source === "api" && apiResult.data?.current_weather) {
    const cw = apiResult.data.current_weather;
    const units = apiResult.data.current_weather_units || {};
    const cond = getConditionLabel(cw.weathercode);
    const isDay = cw.is_day ? "Day" : "Night";
    lines.push(`Weather - ${city}`);
    lines.push(`Time: ${cw.time} (${isDay})`);
    lines.push(`Temperature: ${cw.temperature}${units.temperature || "°C"}`);
    lines.push(`Condition: ${cond}`);
    lines.push(
      `Wind: ${cw.windspeed}${units.windspeed || " km/h"} @ ${
        cw.winddirection
      }°`
    );
    lines.push(`Note: Data from ${apiDomain}`);
  } else if (apiResult.source === "mock") {
    const d = apiResult.data;
    lines.push(`Weather - ${city} (Mock Data)`);
    lines.push(`Temperature: ${d.temperature}°C`);
    lines.push(`Condition: ${d.conditions}`);
    lines.push(`Humidity: ${d.humidity}%`);
    lines.push(`Wind: ${d.windSpeed} km/h`);
    lines.push(`Note: (API unavailable or failed) Showing mock data`);
  } else {
    lines.push(`Weather - ${city}: unavailable`);
    if (apiResult.note) lines.push(`Note: ${apiResult.note}`);
  }
  return lines.join("\n");
}

// Helper to format forecast output
function formatForecast(apiResult: any, city: string): string {
  let lines: string[] = [];
  const apiDomain =
    process.env["WEATHER_API_BASE"] || "https://api.open-meteo.com";
  if (apiResult.source === "api" && apiResult.data?.daily) {
    const d = apiResult.data.daily;
    const units = (apiResult.data as any).daily_units || {};
    const len = Math.min(
      d.time?.length || 0,
      d.temperature_2m_max?.length || 0,
      d.temperature_2m_min?.length || 0,
      d.weathercode?.length || 0
    );
    lines.push(`5-day Forecast - ${city}`);
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
    lines.push(`Note: Data from ${apiDomain}`);
  } else if (apiResult.source === "mock" && Array.isArray(apiResult.data)) {
    lines.push(`5-day Forecast - ${city} (Mock Data)`);
    for (const day of apiResult.data) {
      lines.push(
        `${day.date}: min ${day.temperature.min}°C / max ${day.temperature.max}°C, ${day.conditions}`
      );
    }
    let reason = "Note: Showing mock data (API unavailable or failed)";
    if (apiResult.note) reason += `: ${apiResult.note}`;
    lines.push(reason);
  } else {
    lines.push(`5-day Forecast - ${city}: unavailable`);
    if (apiResult.note) lines.push(`Note: ${apiResult.note}`);
  }
  return lines.join("\n");
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
      description:
        "☀️ Get current weather (service). Returns { source, note?, data }",
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
      // Build a friendly text summary using a helper
      const text = formatCurrentWeather(apiResult, sanitized);
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
      // Build a friendly 5-day forecast summary using a helper
      const text = formatForecast(apiResult, sanitized);
      return { content: [{ type: "text", text }] };
    }
  );
}

// Start the server if run directly
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
    console.error("Weather MCP server running (stdio mode)");
  } catch (err: any) {
    console.error("Fatal error starting Weather MCP server:", err);
    process.exit(1);
  }
})();
