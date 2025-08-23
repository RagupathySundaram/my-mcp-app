import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs/promises";
import * as path from "path";
import { pathToFileURL } from "url";
import { Logger } from "../utils/logger.js";

const logger = new Logger("FileServer", "file-server.log");

interface FileMetadata {
  name: string;
  size: number;
  created: string;
  modified: string;
  isDirectory: boolean;
  isFile: boolean;
  path: string;
}

async function getFileMetadata(filePath: string): Promise<FileMetadata> {
  const stats = await fs.stat(filePath);
  return {
    name: path.basename(filePath),
    size: stats.size,
    created: stats.birthtime.toISOString(),
    modified: stats.mtime.toISOString(),
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    path: filePath,
  };
}

async function searchFiles(
  directory: string,
  pattern: string
): Promise<FileMetadata[]> {
  const results: FileMetadata[] = [];
  const files = await fs.readdir(directory, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    if (file.name.toLowerCase().includes(pattern.toLowerCase())) {
      results.push(await getFileMetadata(fullPath));
    }
    if (file.isDirectory()) {
      results.push(...(await searchFiles(fullPath, pattern)));
    }
  }
  return results;
}

export function registerFileTools(server: McpServer) {
  server.tool(
    "read",
    "Read contents of a file",
    {
      path: z.string().describe("Path to the file to read"),
    },
    async ({ path }) => {
      const content = await fs.readFile(path, "utf-8");
      await logger.log(`Successfully read file: ${path}`, "INFO");
      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    }
  );

  server.tool(
    "list",
    "List contents of a directory with metadata",
    {
      path: z.string().describe("Path to the directory to list"),
    },
    async ({ path: inputPath }) => {
      const dir = (inputPath || "").toString().trim();
      const absDir = path.resolve(dir);
      const files = await fs.readdir(absDir, { withFileTypes: true });
      const fileList = await Promise.all(
        files.map(
          async (file) => await getFileMetadata(path.join(absDir, file.name))
        )
      );
      await logger.log(`Listed directory: ${absDir}`, "INFO");
      // Format into simple, readable lines
      const human = (n: number) => {
        if (n < 1024) return `${n} B`;
        const units = ["KB", "MB", "GB", "TB"];
        let i = -1;
        let v = n;
        do {
          v = v / 1024;
          i++;
        } while (v >= 1024 && i < units.length - 1);
        return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
      };
      const lines: string[] = [];
      lines.push(`Directory: ${absDir}`);
      lines.push(`Items: ${fileList.length}`);
      for (const f of fileList) {
        const tag = f.isDirectory ? "DIR " : "FILE";
        const name = f.isDirectory ? `${f.name}/` : f.name;
        const size = f.isDirectory ? "-" : human(f.size);
        lines.push(
          `- [${tag}] ${name}  size: ${size}  modified: ${f.modified}`
        );
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "search",
    "Search for files in a directory",
    {
      path: z.string().describe("Directory to search in"),
      pattern: z
        .string()
        .describe("Search pattern to match against file names"),
    },
    async ({ path: inputPath, pattern }) => {
      const dir = (inputPath || "").toString().trim();
      const absDir = path.resolve(dir);
      const results = await searchFiles(absDir, pattern || "");
      await logger.log(
        `Searched files in: ${absDir} for pattern: ${pattern}`,
        "INFO"
      );
      const lines: string[] = [];
      lines.push(`Search in: ${absDir}`);
      lines.push(`Pattern: ${pattern || ""}`);
      lines.push(`Matches: ${results.length}`);
      const human = (n: number) => {
        if (n < 1024) return `${n} B`;
        const units = ["KB", "MB", "GB", "TB"];
        let i = -1;
        let v = n;
        do {
          v = v / 1024;
          i++;
        } while (v >= 1024 && i < units.length - 1);
        return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
      };
      for (const f of results) {
        const tag = f.isDirectory ? "DIR " : "FILE";
        const name = f.isDirectory ? `${f.name}/` : f.name;
        const size = f.isDirectory ? "-" : human(f.size);
        lines.push(
          `- [${tag}] ${name}  size: ${size}  modified: ${f.modified}  path: ${f.path}`
        );
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // Use a namespaced tool name to avoid collisions with other services
  server.tool("file_logs", "View file server logs", {}, async () => {
    const logContent = await logger.readLogs();
    return {
      content: [
        {
          type: "text",
          text: logContent,
        },
      ],
    };
  });
}

// If executed directly, start a standalone file server process
const isDirect = (() => {
  try {
    const href = pathToFileURL(process.argv[1]).href;
    return import.meta.url === href;
  } catch {
    return false;
  }
})();
if (isDirect) {
  (async function main() {
    const server = new McpServer({
      name: "fileSystem",
      version: "1.0.0",
      capabilities: {
        resources: {},
        tools: {},
      },
    });
    registerFileTools(server);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("File MCP Server running on stdio");
  })().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}
