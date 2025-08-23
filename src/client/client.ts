import { printWeatherHelp, printFileHelp } from "../utils/clientHelp.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "readline";
import "dotenv/config";

export async function startClient(spawnArgs?: {
  command?: string;
  args?: string[];
  cwd?: string;
}) {
  const transport = new StdioClientTransport({
    command:
      spawnArgs?.command ??
      (process.platform === "win32" ? "node.exe" : "node"),
    args: spawnArgs?.args ?? ["build/weather/service.js"],
    cwd: spawnArgs?.cwd ?? process.cwd(),
  });

  const client = new Client(
    { name: "mcp-cli-client", version: "1.0.0" },
    { capabilities: { sampling: {} } }
  );
  await client.connect(transport);
  console.log("✅ Connected to MCP server\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  async function prompt(query: string): Promise<string> {
    return new Promise((resolve) => rl.question(query, resolve));
  }

  // Weather-only mode if we're spawning the weather service
  const targetingWeather =
    process.env.MCP_CLIENT_WEATHER_MODE === "1" ||
    (spawnArgs?.args || []).some(
      (a) =>
        /weather[\\/]+service\.js$/i.test(a) || a.includes("weather/service.js")
    );
  // File-only mode if we're spawning the file server
  const targetingFile =
    process.env.MCP_CLIENT_FILE_MODE === "1" ||
    (spawnArgs?.args || []).some(
      (a) =>
        /fileServer[\\/]+server\.js$/i.test(a) ||
        a.includes("fileServer/server.js")
    );

  if (targetingWeather) {
    // Show help immediately
    printWeatherHelp();
    console.log("Default city: Chennai (if omitted)\n");

    const defaultCity = "Chennai";
    while (true) {
      const input = await prompt(
        "weather> Enter command (weather <city> | forecast <city> | logs | help | exit): "
      );
      const raw = input.trim();
      const [cmd, ...rest] = raw.split(/\s+/);
      const command = (cmd || "").toLowerCase();
      const cityArg = rest.join(" ");

      if (!command) continue;
      if (command === "exit" || command === "quit") break;
      if (command === "help" || command === "?") {
        printWeatherHelp();
        console.log("Default city: Chennai (if omitted)\n");
        continue;
      }

      try {
        if (command === "weather" || command === "current") {
          const city = cityArg || defaultCity;
          const result = await client.callTool({
            name: "current",
            arguments: { city },
          });
          const items: any[] = Array.isArray((result as any)?.content)
            ? ((result as any).content as any[])
            : [];
          const text = items.find((c: any) => c.type === "text")?.text;
          console.log("\n" + (text || JSON.stringify(result, null, 2)));
          continue;
        }
        if (command === "forecast") {
          const city = cityArg || defaultCity;
          const result = await client.callTool({
            name: "forecast",
            arguments: { city },
          });
          const items: any[] = Array.isArray((result as any)?.content)
            ? ((result as any).content as any[])
            : [];
          const text = items.find((c: any) => c.type === "text")?.text;
          console.log("\n" + (text || JSON.stringify(result, null, 2)));
          continue;
        }
        if (command === "logs") {
          const result = await client.callTool({ name: "logs", arguments: {} });
          console.log("\nLogs:\n", JSON.stringify(result, null, 2));
          continue;
        }

        console.log(
          "Unknown command. Try: weather <city> | forecast <city> | logs | help | exit\n"
        );
      } catch (err: any) {
        console.error("❌ Error:", err);
      }
    }
  } else if (targetingFile) {
    // File server REPL
    printFileHelp();
    while (true) {
      const input = await prompt(
        "file> Enter command (read <path> | list <dir> | search <dir> <pattern> | file_logs | help | exit): "
      );
      const raw = input.trim();
      if (!raw) continue;
      const parts = raw.split(/\s+/);
      const command = (parts.shift() || "").toLowerCase();
      if (command === "exit" || command === "quit") break;
      if (command === "help" || command === "?") {
        printFileHelp();
        continue;
      }
      try {
        if (command === "read") {
          const p = parts.join(" ");
          const result = await client.callTool({
            name: "read",
            arguments: { path: p },
          });
          const items: any[] = Array.isArray((result as any)?.content)
            ? ((result as any).content as any[])
            : [];
          const text = items.find((c: any) => c.type === "text")?.text;
          console.log("\n" + (text || JSON.stringify(result, null, 2)));
          continue;
        }
        if (command === "list") {
          const dir = parts.join(" ");
          const result = await client.callTool({
            name: "list",
            arguments: { path: dir },
          });
          const items: any[] = Array.isArray((result as any)?.content)
            ? ((result as any).content as any[])
            : [];
          const text = items.find((c: any) => c.type === "text")?.text;
          console.log("\n" + (text || JSON.stringify(result, null, 2)));
          continue;
        }
        if (command === "search") {
          const dir = parts.shift() || "";
          const pattern = parts.join(" ");
          const result = await client.callTool({
            name: "search",
            arguments: { path: dir, pattern },
          });
          const items: any[] = Array.isArray((result as any)?.content)
            ? ((result as any).content as any[])
            : [];
          const text = items.find((c: any) => c.type === "text")?.text;
          console.log("\n" + (text || JSON.stringify(result, null, 2)));
          continue;
        }
        if (command === "file_logs" || command === "logs") {
          const result = await client.callTool({
            name: "file_logs",
            arguments: {},
          });
          const items: any[] = Array.isArray((result as any)?.content)
            ? ((result as any).content as any[])
            : [];
          const text = items.find((c: any) => c.type === "text")?.text;
          console.log("\n" + (text || JSON.stringify(result, null, 2)));
          continue;
        }
        console.log(
          "Unknown command. Try: read <path> | list <dir> | search <dir> <pattern> | file_logs | help | exit\n"
        );
      } catch (err: any) {
        console.error("❌ Error:", err);
      }
    }
  } else {
    // Fallback removed for simplicity: print message and quit
    console.log(
      "No interactive mode selected. Use: npm run client:weather or npm run client:file"
    );
    rl.close();
    await client.close();
    return;
  }

  rl.close();
  await client.close();
  console.log("🔌 Disconnected");
  console.log("Logs written to logs/client.log");
}

// If run directly, start client with default spawn args
const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) {
  startClient().catch(async (err) => {
    console.error("❌ MCP client error:", err);
    process.exit(1);
  });
}
