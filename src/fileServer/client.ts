import * as readline from 'readline';
import fetch from 'node-fetch';
const BASE_URL = process.env.FILE_SERVER_URL || 'http://localhost:3000';
import * as path from 'path';
import { Logger } from '../utils/logger.js';

function handleServerError(error: any, context: string) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.error(`❌ Cannot connect to file server. Please make sure the server is running and accessible at ${BASE_URL}`);
    } else {
        console.error(`❌ Error ${context} from server:`, error.message);
    }
}

const logger = new Logger('FileClient', 'file-client.log');

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
    throw new Error('Direct file info access is not allowed. Use the server endpoint instead.');
}

async function findFiles(searchPath: string, pattern: string) {
    throw new Error('Direct file search is not allowed. Use the server endpoint instead.');
}

async function main() {
    console.log('\n🚀 Welcome to Interactive File System Client!');
    printHelp();

    rl.on('line', async (input) => {
        if (input.toLowerCase() === 'quit') {
            console.log('👋 Goodbye!');
            await logger.log('Client session ended', 'FILE_CLIENT');
            rl.close();
            process.exit(0);
        }

        // Check if server is up before processing command
        let serverUp = true;
        try {
            const healthResponse = await fetch(`${BASE_URL}/health`);
            if (!healthResponse.ok) serverUp = false;
        } catch (err: any) {
            serverUp = false;
            handleServerError(err, 'checking server health');
        }
        if (!serverUp) {
            handleServerError(new Error('ECONNREFUSED'), 'checking server health');
            console.log('\n🚀 Enter a command (or "help" for commands):');
            return;
        }

        const [command, ...args] = input.split(' ');
        const filePath = args.join(' ');

        try {
            switch (command.toLowerCase()) {
                case 'read': {
                    if (!filePath) {
                        console.log('❌ Please provide a file path to read');
                        await logger.log('Error: No file path provided for read command', 'ERROR');
                        break;
                    }
                    const response = await fetch(`${BASE_URL}/read?path=${encodeURIComponent(filePath)}`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const result = await response.json() as {
                        formatting: { header: string; separator: string };
                        content: string;
                    };
                    console.log(`\n${result.formatting.header}`);
                    console.log(result.formatting.separator);
                    console.log(result.content);
                    await logger.log(`Successfully read file: ${filePath}`, 'FILE_CLIENT');
                    break;
                }
                case 'list': {
                    if (!filePath) {
                        console.log('❌ Please provide a directory path to list');
                        await logger.log('Error: No directory path provided for list command', 'ERROR');
                        break;
                    }
                    const response = await fetch(`${BASE_URL}/list?path=${encodeURIComponent(filePath)}`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const result = await response.json() as {
                        header: string;
                        separator: string;
                        files: { icon: string; name: string }[];
                    };
                    console.log(`\n${result.header}`);
                    console.log(result.separator);
                    result.files.forEach((file) => {
                        console.log(`  ${file.icon} ${file.name}`);
                    });
                    await logger.log(`Successfully listed directory: ${filePath}`, 'FILE_CLIENT');
                    break;
                }
                case 'find': {
                    if (args.length < 2) {
                        console.log('❌ Usage: find <directory> <pattern>');
                        await logger.log('Error: Invalid arguments for find command', 'ERROR');
                        break;
                    }
                    const [searchPath, pattern] = [args[0], args.slice(1).join(' ')];
                    const response = await fetch(`${BASE_URL}/search?path=${encodeURIComponent(searchPath)}&pattern=${encodeURIComponent(pattern)}`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const result = await response.json() as {
                        header: string;
                        separator: string;
                        files: { icon: string; name: string }[];
                    };
                    console.log(`\n${result.header}`);
                    console.log(result.separator);
                    if (result.files.length === 0) {
                        console.log('  No files found matching the pattern');
                        await logger.log(`No files found matching pattern "${pattern}" in ${searchPath}`, 'FILE_CLIENT');
                    } else {
                        result.files.forEach((file) => console.log(`  ${file.icon} ${file.name}`));
                        await logger.log(`Found ${result.files.length} files matching pattern "${pattern}" in ${searchPath}`, 'FILE_CLIENT');
                    }
                    break;
                }
                case 'info': {
                    if (!filePath) {
                        console.log('❌ Please provide a file path to get info');
                        await logger.log('Error: No file path provided for info command', 'ERROR');
                        break;
                    }
                    const response = await fetch(`${BASE_URL}/read?path=${encodeURIComponent(filePath)}`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const result = await response.json() as {
                        info?: {
                            isDirectory: boolean;
                            size: string;
                            created: string;
                            modified: string;
                        };
                        content?: string;
                    };
                    // Assuming server returns file info in formatting or content
                    console.log('\n📊 File Information:');
                    console.log('-----------------');
                    if (result.info) {
                        console.log(`  Type: ${result.info.isDirectory ? 'Directory' : 'File'}`);
                        console.log(`  Size: ${result.info.size}`);
                        console.log(`  Created: ${result.info.created}`);
                        console.log(`  Last Modified: ${result.info.modified}`);
                    } else if (result.content) {
                        console.log(result.content);
                    }
                    await logger.log(`Retrieved info for ${filePath}`, 'FILE_CLIENT');
                    break;
                }
                case 'logs': {
                    const response = await fetch(`${BASE_URL}/logs`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const result = await response.json() as {
                        header: string;
                        separator: string;
                        content?: string;
                    };
                    console.log(`\n${result.header}`);
                    console.log(result.separator);
                    console.log(result.content || 'No logs available');
                    break;
                }
                case 'help': {
                    printHelp();
                    break;
                }
                default: {
                    console.log('❌ Unknown command. Type "help" to see available commands');
                }
            }
        } catch (error: any) {
            handleServerError(error, command);
        }
        // Add a prompt for the next command
        console.log('\n🚀 Enter a command (or "help" for commands):');
    });
}

main().catch(console.error);
