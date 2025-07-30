import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger.js';

const logger = new Logger('FileClient', 'client.log');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const printHelp = () => {
    console.log('\n📁 File System Client Commands:');
    console.log('--------------------------------');
    console.log('📖 read <filepath>     - Read contents of a file');
    console.log('📂 list <dirpath>      - List contents of a directory');
    console.log('🔍 find <pattern>      - Search for files by pattern');
    console.log('📊 info <filepath>     - Show file information');
    console.log('📋 logs               - View server logs');
    console.log('❓ help               - Show this help message');
    console.log('👋 quit               - Exit the program\n');
};

async function getFileInfo(filePath: string) {
    try {
        const stats = await fs.stat(filePath);
        return {
            size: `${(stats.size / 1024).toFixed(2)} KB`,
            created: stats.birthtime.toLocaleString(),
            modified: stats.mtime.toLocaleString(),
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile()
        };
    } catch (error: any) {
        throw new Error(`Could not get file info: ${error.message}`);
    }
}

async function findFiles(searchPath: string, pattern: string) {
    try {
        const files = await fs.readdir(searchPath);
        return files.filter(file => file.includes(pattern));
    } catch (error: any) {
        throw new Error(`Could not search files: ${error.message}`);
    }
}

async function main() {
    console.log('\n🚀 Welcome to Interactive File System Client!');
    printHelp();

    rl.on('line', async (input) => {
        if (input.toLowerCase() === 'quit') {
            console.log('👋 Goodbye!');
            await logger.log('Client session ended', 'CLIENT');
            rl.close();
            process.exit(0);
        }

        const [command, ...args] = input.split(' ');
        const filePath = args.join(' ');

        try {
            switch (command.toLowerCase()) {
                case 'read':
                    if (!filePath) {
                        console.log('❌ Please provide a file path to read');
                        await logger.log('Error: No file path provided for read command', 'ERROR');
                        break;
                    }
                    const content = await fs.readFile(filePath, 'utf-8');
                    console.log('\n📖 File Contents:');
                    console.log('---------------');
                    console.log(content);
                    await logger.log(`Successfully read file: ${filePath}`, 'CLIENT');
                    break;

                case 'list':
                    if (!filePath) {
                        console.log('❌ Please provide a directory path to list');
                        await logger.log('Error: No directory path provided for list command', 'ERROR');
                        break;
                    }
                    const files = await fs.readdir(filePath);
                    console.log('\n📂 Directory Contents:');
                    console.log('-------------------');
                    files.forEach(file => {
                        console.log(`  📄 ${file}`);
                    });
                    await logger.log(`Successfully listed directory: ${filePath}`, 'CLIENT');
                    break;

                case 'find':
                    if (args.length < 2) {
                        console.log('❌ Usage: find <directory> <pattern>');
                        await logger.log('Error: Invalid arguments for find command', 'ERROR');
                        break;
                    }
                    const [searchPath, pattern] = [args[0], args.slice(1).join(' ')];
                    const foundFiles = await findFiles(searchPath, pattern);
                    console.log('\n🔍 Search Results:');
                    console.log('---------------');
                    if (foundFiles.length === 0) {
                        console.log('  No files found matching the pattern');
                        await logger.log(`No files found matching pattern "${pattern}" in ${searchPath}`, 'CLIENT');
                    } else {
                        foundFiles.forEach(file => console.log(`  📄 ${file}`));
                        await logger.log(`Found ${foundFiles.length} files matching pattern "${pattern}" in ${searchPath}`, 'CLIENT');
                    }
                    break;

                case 'info':
                    if (!filePath) {
                        console.log('❌ Please provide a file path to get info');
                        await logger.log('Error: No file path provided for info command', 'ERROR');
                        break;
                    }
                    const info = await getFileInfo(filePath);
                    console.log('\n📊 File Information:');
                    console.log('-----------------');
                    console.log(`  Type: ${info.isDirectory ? 'Directory' : 'File'}`);
                    console.log(`  Size: ${info.size}`);
                    console.log(`  Created: ${info.created}`);
                    console.log(`  Last Modified: ${info.modified}`);
                    await logger.log(`Retrieved info for ${filePath}`, 'CLIENT');
                    break;

                case 'logs':
                    try {
                        const logFile = path.join('logs', 'server.log');
                        const logs = await fs.readFile(logFile, 'utf-8');
                        console.log('\n📋 Server Logs:');
                        console.log('-------------');
                        console.log(logs || 'No logs available');
                    } catch (error: any) {
                        console.error('❌ Could not read logs:', error.message);
                    }
                    break;

                case 'help':
                    printHelp();
                    break;

                default:
                    console.log('❌ Unknown command. Type "help" to see available commands');
            }
        } catch (error: any) {
            console.error('❌ Error:', error.message);
        }
        
        // Add a prompt for the next command
        console.log('\n🚀 Enter a command (or "help" for commands):');
    });
}

main().catch(console.error);
