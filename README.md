<<<<<<< HEAD

# my-mcp-app

This app is a complete Model Context Protocol (MCP) ecosystem in Node.js/TypeScript. It includes:

- Weather server/client (mock and real API)
- File server/client (list, read, search, logs)
- MCP configuration for all endpoints

## What is MCP?

MCP (Model Context Protocol) is a protocol for building modular, tool-using AI agents that interact with servers, tools, and APIs in a structured way.

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Build the project:**

   ```bash
   npm run build
   ```

3. **Run servers and clients:**

   ```bash
   # File server and client
   npm run file-server
   npm run file-client

   # Weather server and client (mock)
   npm run weather-server
   npm run weather-client

   # Weather server and client (real API)
   npm run weather-api-server
   npm run weather-api-client
   ```

4. **Try it out:**
   - Use the interactive clients to list files, read file contents, or get weather forecasts.
   - Experiment with commands and endpoints defined in `.vscode/mcp.json`.

## Project Structure

- `src/` - Source code for servers and clients
- `.vscode/mcp.json` - MCP configuration

## Extending to Agentic AI & Learning Platform

See [ROADMAP.md](./ROADMAP.md) for:

- Steps to expand this app into a multi-agentic AI platform
- Integrating LangGraph and other frameworks
- Hosting as a learning app with multiple AI agents

## License

This project is part of the MCP ecosystem and follows the same licensing terms.

> > > > > > > 816e732 (Initial commit of my new project)
