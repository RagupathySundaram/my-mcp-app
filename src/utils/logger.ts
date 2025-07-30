import * as fs from 'fs/promises';
import * as path from 'path';

export type LogType = 'INFO' | 'ERROR' | 'ACCESS' | 'CLIENT';

export class Logger {
    private logsDir: string;
    private logFile: string;
    private component: string;

    constructor(component: string, logFileName: string = 'app.log') {
        this.logsDir = 'logs';
        this.logFile = path.join(this.logsDir, logFileName);
        this.component = component;
    }

    async log(message: string, type: LogType = 'INFO') {
        try {
            // Ensure logs directory exists
            try {
                await fs.access(this.logsDir);
            } catch {
                await fs.mkdir(this.logsDir, { recursive: true });
                console.log('Created logs directory');
            }

            const now = new Date();
            const timestamp = now.toISOString();
            const formattedTime = now.toLocaleString();
            const logEntry = `[${timestamp}] [${type}] [${this.component}] ${message} (${formattedTime})\n`;
            
            await fs.appendFile(this.logFile, logEntry);
            
            // Console feedback for logging (can be disabled in production)
            if (process.env.NODE_ENV !== 'production') {
                console.log(`Logged: ${message}`);
            }
        } catch (error: any) {
            console.error('Logging error:', error.message);
        }
    }

    async readLogs(maxLines?: number): Promise<string> {
        try {
            const logs = await fs.readFile(this.logFile, 'utf-8');
            if (maxLines) {
                return logs.split('\n').slice(-maxLines).join('\n');
            }
            return logs;
        } catch (error: any) {
            throw new Error(`Could not read logs: ${error.message}`);
        }
    }
}
