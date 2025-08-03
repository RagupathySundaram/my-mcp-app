import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(serverCommand: string, serverArgs: string[] = []): Promise<void> {
    this.transport = new StdioClientTransport({ command: serverCommand, args: serverArgs });
    this.client = new Client({ name: "mcp-weather-client", version: "1.0.0" }, { capabilities: { sampling: {} } });
    await this.client.connect(this.transport);
    console.log("✅ Connected to MCP server successfully");
  }

  async listTools(): Promise<any[]> {
    if (!this.client) throw new Error("Client not connected. Call connect() first.");
    const response = await this.client.listTools();
    return response.tools || [];
  }

  async callTool(name: string, arguments_: any = {}): Promise<any> {
    if (!this.client) throw new Error("Client not connected. Call connect() first.");
    return await this.client.callTool({ name, arguments: arguments_ });
  }

  async listResources(): Promise<any[]> {
    if (!this.client) throw new Error("Client not connected. Call connect() first.");
    const response = await this.client.listResources();
    return response.resources || [];
  }

  async disconnect(): Promise<void> {
    if (this.client) await this.client.close();
    if (this.transport) await this.transport.close();
    this.client = null;
    this.transport = null;
    console.log("🔌 Disconnected from MCP server");
  }
}
