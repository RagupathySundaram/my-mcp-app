import { isServerUp } from '../utils/serverHealth.js';
import * as readline from 'readline';
import { Logger } from '../utils/logger.js';

const WEATHER_SERVER_URL = process.env.WEATHER_SERVER_URL || 'http://localhost:3001';

const logger = new Logger('WeatherClient', 'weather-client.log');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const printHelp = () => {
    console.log('\n🌤️ Weather Client Commands:');
    console.log('-------------------------');
    console.log('🌡️  weather <city>     - Get current weather');
    console.log('📅 forecast <city>    - Get 5-day forecast');
    console.log('📋 logs              - View server logs');
    console.log('❓ help              - Show this help message');
    console.log('👋 quit              - Exit the program\n');
};

async function getCurrentWeather(city: string) {
    try {
        const response = await fetch(`${WEATHER_SERVER_URL}/current?city=${encodeURIComponent(city)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error: any) {
        throw new Error(`Could not get weather: ${error.message}`);
    }
}

async function getForecast(city: string) {
    try {
        const response = await fetch(`${WEATHER_SERVER_URL}/forecast?city=${encodeURIComponent(city)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error: any) {
        throw new Error(`Could not get forecast: ${error.message}`);
    }
}

async function main() {
    console.log('\n🌤️ Welcome to Interactive Weather Client!');
    printHelp();

    rl.on('line', async (input) => {
        if (input.toLowerCase() === 'quit') {
            console.log('👋 Goodbye!');
            await logger.log('Client session ended', 'CLIENT');
            rl.close();
            process.exit(0);
        }

        const [command, ...args] = input.split(' ');
        const city = args.join(' ');

        // Health check before commands except help/logs
        if (!['help', 'logs', ''].includes(command.toLowerCase())) {
            const serverUp = await isServerUp(WEATHER_SERVER_URL);
            if (!serverUp) {
                console.log('❌ Weather server is not running. Please start the server and try again.');
                console.log('\n🌤️ Enter a command (or "help" for commands):');
                return;
            }
        }

        try {
            switch (command.toLowerCase()) {
                case 'weather': {
                    if (!city) {
                        console.log('❌ Please provide a city name');
                        await logger.log('Error: No city provided for weather command', 'ERROR');
                        break;
                    }
                    // Health check already performed above
                    const weather = await getCurrentWeather(city);
                    console.log('\n🌡️ Current Weather: Results from Mock data (not Real)');
                    console.log('----------------');
                    console.log(`  City: ${weather.city}`);
                    console.log(`  Temperature: ${weather.temperature}°C`);
                    console.log(`  Conditions: ${weather.conditions}`);
                    console.log(`  Humidity: ${weather.humidity}%`);
                    console.log(`  Wind Speed: ${weather.windSpeed} km/h`);
                    await logger.log(`Successfully retrieved weather for ${city}`, 'CLIENT');
                    break;
                }
                case 'forecast': {
                    if (!city) {
                        console.log('❌ Please provide a city name');
                        await logger.log('Error: No city provided for forecast command', 'ERROR');
                        break;
                    }
                    // Health check already performed above
                    const forecast = await getForecast(city);
                    console.log('\n📅 5-Day Forecast: Results from Mock data (not Real)');
                    console.log('---------------');
                    forecast.forEach((day: any) => {
                        console.log(`  ${day.date}:`);
                        console.log(`    Temperature: ${day.temperature.min}°C - ${day.temperature.max}°C`);
                        console.log(`    Conditions: ${day.conditions}\n`);
                    });
                    await logger.log(`Successfully retrieved forecast for ${city}`, 'CLIENT');
                    break;
                }

                case 'logs':
                    try {
                        const response = await fetch(`${WEATHER_SERVER_URL}/logs`);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const logs = await response.text();
                        console.log('\n📋 Weather Server Logs:');
                        console.log('-------------------');
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
        
        console.log('\n🌤️ Enter a command (or "help" for commands):');
    });
}

main().catch(console.error);
