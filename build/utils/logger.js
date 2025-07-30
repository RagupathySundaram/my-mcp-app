import * as fs from 'fs/promises';
import * as path from 'path';
export class Logger {
    logsDir;
    logFile;
    component;
    constructor(component, logFileName = 'app.log') {
        this.logsDir = 'logs';
        this.logFile = path.join(this.logsDir, logFileName);
        this.component = component;
    }
    async log(message, type = 'INFO') {
        try {
            // Ensure logs directory exists
            try {
                await fs.access(this.logsDir);
            }
            catch {
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
        }
        catch (error) {
            console.error('Logging error:', error.message);
        }
    }
    async readLogs(maxLines) {
        try {
            const logs = await fs.readFile(this.logFile, 'utf-8');
            if (maxLines) {
                return logs.split('\n').slice(-maxLines).join('\n');
            }
            return logs;
        }
        catch (error) {
            throw new Error(`Could not read logs: ${error.message}`);
        }
    }
}
