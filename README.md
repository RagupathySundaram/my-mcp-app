<<<<<<< HEAD
# my-mcp-app
my-mcp-app
=======
# MCP Weather Client & Agent

A complete Model Context Protocol (MCP) client implementation with an intelligent weather agent built on Node.js/TypeScript.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Your App/CLI   │───▶│   Weather Agent  │───▶│   MCP Client    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │  MCP Server     │
                                               │  (Weather API)  │
                                               └─────────────────┘
```

## 📁 Project Structure

```
src/
├── index.ts              # MCP Weather Server
├── client.ts             # Low-level MCP Client
├── agent.ts              # Intelligent Weather Agent
├── apiClient.ts          # High-level API Client
├── interactiveClient.ts  # Interactive CLI Client
└── runExample.ts         # Example runner
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Run Examples

**Interactive Client (Recommended for testing):**
```bash
npm run client
```

**API Example (Programmatic usage):**
```bash
npm run api-example
```

**Server Only:**
```bash
npm run server
```

## 💡 Usage Examples

### Interactive CLI Client

```bash
npm run client
```

Then try these commands:
- `Weather forecast for San Francisco`
- `Any alerts for CA?`
- `Get forecast for lat 40.7128, lon -74.0060`
- `help` - Show available commands
- `history` - Show conversation history
- `quit` - Exit

### Programmatic API Usage

```typescript
import { WeatherAPIClient } from './apiClient.js';

const client = new WeatherAPIClient();

// Initialize the client
await client.initialize();

// Get weather forecast
const forecast = await client.getForecast(40.7128, -74.0060);
console.log(forecast);

// Get weather alerts
const alerts = await client.getAlerts("CA");
console.log(alerts);

// Ask natural language questions
const response = await client.askQuestion("What's the weather like in New York?");
console.log(response);

// Clean up
await client.disconnect();
```

## 🛠️ Advanced Usage

### Custom Agent Implementation

```typescript
import { WeatherAgent } from './agent.js';

const agent = new WeatherAgent();

// Initialize with custom server
await agent.initialize("node", ["path/to/your/server.js"]);

// Process messages
const response = await agent.processMessage("Weather forecast for Tokyo");
console.log(response);

// Get conversation history
const history = agent.getConversationHistory();
```

### Low-level MCP Client Usage

```typescript
import { MCPClient } from './client.js';

const client = new MCPClient();

// Connect to server
await client.connect("node", ["build/index.js"]);

// List available tools
const tools = await client.listTools();
console.log("Available tools:", tools);

// Call a tool directly
const result = await client.callTool("get_forecast", {
  latitude: 37.7749,
  longitude: -122.4194
});

console.log("Tool result:", result);
```

## 🔧 Available Commands

### NPM Scripts
- `npm run build` - Build TypeScript to JavaScript
- `npm run server` - Run the MCP weather server
- `npm run client` - Run interactive client
- `npm run api-example` - Run API usage example

### Agent Commands
The agent understands natural language queries:

**Weather Forecasts:**
- "Weather forecast for [location]"
- "Get forecast for lat X, lon Y"
- "What's the weather like in [city]?"

**Weather Alerts:**
- "Any alerts for [STATE]?"
- "Weather warnings for California"
- "Show alerts for NY"

**Utility Commands:**
- `help` - Show help information
- `history` - Show conversation history
- `clear` - Clear terminal
- `quit`/`exit` - Exit application

## 🏛️ Architecture Details

### 1. MCP Client (`client.ts`)
- Low-level MCP protocol implementation
- Handles server connection and communication
- Tool invocation and response handling

### 2. Weather Agent (`agent.ts`)
- Intelligent natural language processing
- Context-aware tool selection
- Conversation history management
- Response generation and formatting

### 3. API Client (`apiClient.ts`)
- High-level programmatic interface
- Simplified method calls
- Error handling and cleanup

### 4. Interactive Client (`interactiveClient.ts`)
- CLI interface with readline
- Command history and completion
- Graceful shutdown handling

## 🔍 Error Handling

The client includes comprehensive error handling:

- **Connection Errors**: Automatic retry and graceful degradation
- **Tool Errors**: Descriptive error messages and fallback responses
- **Input Validation**: Validates coordinates and state codes
- **Graceful Shutdown**: Proper cleanup of resources

## 🔧 Extending the Agent

### Adding New Tools

1. **Update the Agent's Tool Detection:**
```typescript
private determineToolCall(message: string) {
  if (message.includes('your-new-tool-keyword')) {
    return {
      name: 'your_new_tool',
      arguments: { /* extracted args */ }
    };
  }
}
```

2. **Add Response Formatting:**
```typescript
private generateResponseFromToolResult(toolResult: any, toolName: string) {
  if (toolName === 'your_new_tool') {
    return `Formatted response: ${toolResult}`;
  }
}
```

### Custom Server Integration

```typescript
const agent = new WeatherAgent();

// Connect to your custom MCP server
await agent.initialize("python", ["path/to/your/server.py"]);
// or
await agent.initialize("node", ["path/to/your/server.js"]);
```

## 📊 Conversation Flow

```
User Input → Agent Analysis → Tool Selection → MCP Call → Response Generation → User Output
     ↓              ↓              ↓              ↓              ↓              ↓
"Weather in NY" → Parse Intent → get_forecast → Server Call → Format Data → "Here's the forecast..."
```

## 🎯 Key Features

- ✅ **Natural Language Processing**: Understands conversational queries
- ✅ **Smart Tool Selection**: Automatically chooses appropriate tools
- ✅ **Conversation Memory**: Maintains context across interactions
- ✅ **Error Recovery**: Handles failures gracefully
- ✅ **Multiple Interfaces**: CLI, API, and programmatic access
- ✅ **Extensible**: Easy to add new tools and capabilities
- ✅ **Type Safety**: Full TypeScript support

## 🤝 Contributing

To extend this client:

1. Add new tools to the server (`index.ts`)
2. Update agent tool detection (`agent.ts`)
3. Add response formatting logic
4. Update documentation

## 📝 License

This project is part of the MCP ecosystem and follows the same licensing terms.
>>>>>>> 816e732 (Initial commit of my new project)
