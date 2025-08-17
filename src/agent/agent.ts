import { exec, ChildProcess } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';

interface ServiceConfig {
  command: string;
  port: number;
  endpoints: Record<string, string>;
}

interface MCPConfig {
  services: {
    weatherService: ServiceConfig;
  };
}

class Agent {
  private serverProcess: ChildProcess | null = null;
  private config: MCPConfig;

  constructor(configPath: string) {
    const configFile = fs.readFileSync(path.resolve(configPath), 'utf-8');
    this.config = JSON.parse(configFile);
  }

  startService(serviceName: keyof MCPConfig['services']): Promise<void> {
    return new Promise((resolve, reject) => {
      const service = this.config.services[serviceName];
      if (!service) {
        return reject(new Error(`Service "${serviceName}" not found in configuration.`));
      }

      console.log(`Starting ${serviceName}...`);
      this.serverProcess = exec(service.command);

      this.serverProcess.stdout?.on('data', (data) => {
        console.log(`[${serviceName}]: ${data}`);
        if (data.includes('listening') || data.includes('started')) {
          resolve();
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error(`[${serviceName} Error]: ${data}`);
      });

      this.serverProcess.on('error', (err) => {
        reject(err);
      });
    });
  }

  stopService(): void {
    if (this.serverProcess) {
      console.log('Stopping service...');
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async fetchWeather(city: string): Promise<void> {
    const weatherService = this.config.services.weatherService;
    const url = `http://localhost:${weatherService.port}${weatherService.endpoints.current}?city=${city}`;

    console.log(`Fetching weather for ${city}...`);
    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Weather data for ${city}: ${data}`);
      });
    }).on('error', (err) => {
      console.error('Error fetching weather:', err.message);
    });
  }
}

// Main execution
(async () => {
  const agent = new Agent('./mcp.json');

  try {
    await agent.startService('weatherService');
    await agent.fetchWeather('Tokyo');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    agent.stopService();
  }
})();
