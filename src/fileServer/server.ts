import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs/promises";
import * as path from "path";

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
  // Read file tool
  server.tool(
    "read",
    "Read contents of a file",
    { path: z.string().describe("Path to the file to read") },
    async ({ path }) => {
      const content = await fs.readFile(path, "utf-8");
      return { content: [{ type: "text", text: content }] };
    }
  );

  // List directory tool
  server.tool(
    "list",
    "List contents of a directory with metadata",
    { path: z.string().describe("Path to the directory to list") },
    async ({ path: inputPath }) => {
      const dir = (inputPath || "").toString().trim();
      const absDir = path.resolve(dir);
      const files = await fs.readdir(absDir, { withFileTypes: true });
      const fileList = await Promise.all(
        files.map((file) => getFileMetadata(path.join(absDir, file.name)))
      );
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
      const lines: string[] = [
        `Directory: ${absDir}`,
        `Items: ${fileList.length}`,
        ...fileList.map((f) => {
          const tag = f.isDirectory ? "DIR " : "FILE";
          const name = f.isDirectory ? `${f.name}/` : f.name;
          const size = f.isDirectory ? "-" : human(f.size);
          return `- [${tag}] ${name}  size: ${size}  modified: ${f.modified}`;
        }),
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // Search files tool
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
      const lines: string[] = [
        `Search in: ${absDir}`,
        `Pattern: ${pattern || ""}`,
        `Matches: ${results.length}`,
        ...results.map((f) => {
          const tag = f.isDirectory ? "DIR " : "FILE";
          const name = f.isDirectory ? `${f.name}/` : f.name;
          const size = f.isDirectory ? "-" : human(f.size);
          return `- [${tag}] ${name}  size: ${size}  modified: ${f.modified}  path: ${f.path}`;
        }),
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

// Start the server if run directly

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
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("File MCP Server running on stdio");
  } catch (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
  }
})();
