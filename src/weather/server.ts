/**
 * Weather Server - Sample Mock Data
 * ---------------------------------
 * This server returns mock weather and forecast data for any city name provided.
 * You can use any random city name; the data is generated for demonstration purposes only.
 */
// ...existing code...
const MOCK_WEATHER_CONDITIONS = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
import * as http from 'http';
import * as url from 'url';
import { Logger } from '../utils/logger.js';

const logger = new Logger('WeatherServer', 'weather-server.log');

interface WeatherData {
    city: string;
    temperature: number;
    conditions: string;
    humidity: number;
    windSpeed: number;
}

interface ForecastData {
    date: string;
    temperature: {
        min: number;
        max: number;
    };
    conditions: string;
}

// Simulate weather data (replace with actual API calls in production)
function getCurrentWeather(city: string): WeatherData {
    return {
        city,
        temperature: Math.round(15 + Math.random() * 20),
        conditions: MOCK_WEATHER_CONDITIONS[Math.floor(Math.random() * MOCK_WEATHER_CONDITIONS.length)],
        humidity: Math.round(40 + Math.random() * 40),
        windSpeed: Math.round(5 + Math.random() * 20)
    };
}

function getForecast(city: string): ForecastData[] {
    const forecast: ForecastData[] = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        forecast.push({
            date: date.toLocaleDateString(),
            temperature: {
                min: Math.round(10 + Math.random() * 15),
                max: Math.round(20 + Math.random() * 15)
            },
            conditions: MOCK_WEATHER_CONDITIONS[Math.floor(Math.random() * MOCK_WEATHER_CONDITIONS.length)]
        });
    }
    return forecast;
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    const city = parsedUrl.query.city as string;

    await logger.log(`Received ${parsedUrl.pathname} request for city: ${city || 'none'}`, 'ACCESS');

    // Health check endpoint
    if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    try {
        if (parsedUrl.pathname === '/current' || parsedUrl.pathname === '/weather') {
            if (!city) {
                res.writeHead(400);
                res.end('City parameter is required');
                await logger.log('Error: No city parameter provided', 'ERROR');
                return;
            }
            const weather = getCurrentWeather(city);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(weather));
            await logger.log(`Successfully retrieved current weather for ${city}`, 'INFO');
        }
        else if (parsedUrl.pathname === '/forecast') {
            if (!city) {
                res.writeHead(400);
                res.end('City parameter is required');
                await logger.log('Error: No city parameter provided', 'ERROR');
                return;
            }
            const forecast = getForecast(city);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(forecast));
            await logger.log(`Successfully retrieved forecast for ${city}`, 'INFO');
        }
        else if (parsedUrl.pathname === '/logs') {
            const logs = typeof logger.getLogHistory === 'function' ? await logger.getLogHistory() : 'Log history not available';
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(logs);
            await logger.log('Logs viewed', 'INFO');
        }
        else {
            res.writeHead(404);
            res.end('Not found');
            await logger.log(`404: Invalid endpoint ${parsedUrl.pathname}`, 'ERROR');
        }
    } catch (error: any) {
        res.writeHead(500);
        res.end(`Error: ${error.message}`);
        await logger.log(`Error occurred: ${error.message}`, 'ERROR');
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Weather Server running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('- GET  /current?city=<cityname>    - Get current weather');
    console.log('- GET  /forecast?city=<cityname>   - Get 5-day forecast');
    console.log('- GET  /logs                       - View server logs');
});
