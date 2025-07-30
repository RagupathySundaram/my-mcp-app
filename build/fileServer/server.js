import * as http from 'http';
import * as fs from 'fs/promises';
import * as url from 'url';
import * as path from 'path';
import { Logger } from '../utils/logger.js';
const logger = new Logger('FileServer', 'server.log');
async function getFileMetadata(filePath) {
    const stats = await fs.stat(filePath);
    return {
        name: path.basename(filePath),
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        path: filePath
    };
}
async function searchFiles(directory, pattern) {
    const results = [];
    const files = await fs.readdir(directory, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(directory, file.name);
        if (file.name.toLowerCase().includes(pattern.toLowerCase())) {
            results.push(await getFileMetadata(fullPath));
        }
        if (file.isDirectory()) {
            results.push(...await searchFiles(fullPath, pattern));
        }
    }
    return results;
}
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    const reqPath = parsedUrl.query.path;
    const pattern = parsedUrl.query.pattern;
    await logger.log(`Received ${parsedUrl.pathname} request for path: ${reqPath || 'none'}`, 'ACCESS');
    if (!reqPath && parsedUrl.pathname !== '/logs') {
        res.writeHead(400);
        res.end('Path parameter is required');
        await logger.log('Error: No path parameter provided', 'ERROR');
        return;
    }
    try {
        if (parsedUrl.pathname === '/read') {
            const content = await fs.readFile(reqPath, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(content);
            await logger.log(`Successfully read file: ${reqPath}`, 'INFO');
        }
        else if (parsedUrl.pathname === '/list') {
            const files = await fs.readdir(reqPath, { withFileTypes: true });
            const fileDetails = await Promise.all(files.map(file => getFileMetadata(path.join(reqPath, file.name))));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(fileDetails, null, 2));
            await logger.log(`Successfully listed directory: ${reqPath}`, 'INFO');
        }
        else if (parsedUrl.pathname === '/search') {
            if (!pattern) {
                throw new Error('Search pattern is required');
            }
            const results = await searchFiles(reqPath, pattern);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results, null, 2));
            await logger.log(`Searched for "${pattern}" in ${reqPath}`, 'INFO');
        }
        else if (parsedUrl.pathname === '/logs') {
            const logFile = path.join('logs', 'server.log');
            try {
                const logs = await fs.readFile(logFile, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(logs);
                await logger.log('Logs viewed', 'INFO');
            }
            catch (error) {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('No logs found or log file not accessible');
            }
        }
        else {
            res.writeHead(404);
            res.end('Not found');
            await logger.log(`404: Invalid endpoint ${parsedUrl.pathname}`, 'ERROR');
        }
    }
    catch (error) {
        const errorMessage = `Error: ${error.message}`;
        res.writeHead(500);
        res.end(errorMessage);
        await logger.log(`Error occurred: ${errorMessage}`, 'ERROR');
    }
});
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`File Server running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('- GET  /read?path=<filepath>           - Read file contents');
    console.log('- GET  /list?path=<dirpath>           - List directory contents with metadata');
    console.log('- GET  /search?path=<dir>&pattern=<pattern> - Search files');
    console.log('- GET  /logs                          - View server logs');
});
