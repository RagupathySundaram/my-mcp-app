import * as http from 'http';
import * as url from 'url';
import { Logger } from '../utils/logger.js';

const logger = new Logger('WeatherServer', 'weather.log');

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
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
    return {
        city,
        temperature: Math.round(15 + Math.random() * 20),
        conditions: conditions[Math.floor(Math.random() * conditions.length)],
        humidity: Math.round(40 + Math.random() * 40),
        windSpeed: Math.round(5 + Math.random() * 20)
    };
}

function getForecast(city: string): ForecastData[] {
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
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
            conditions: conditions[Math.floor(Math.random() * conditions.length)]
        });
    }
    return forecast;
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    const city = parsedUrl.query.city as string;

    await logger.log(`Received ${parsedUrl.pathname} request for city: ${city || 'none'}`, 'ACCESS');

    if (!city) {
        res.writeHead(400);
        res.end('City parameter is required');
        await logger.log('Error: No city parameter provided', 'ERROR');
        return;
    }

    try {
        if (parsedUrl.pathname === '/current') {
            const weather = getCurrentWeather(city);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(weather));
            await logger.log(`Successfully retrieved current weather for ${city}`, 'INFO');
        }
        else if (parsedUrl.pathname === '/forecast') {
            const forecast = getForecast(city);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(forecast));
            await logger.log(`Successfully retrieved forecast for ${city}`, 'INFO');
        }
        else if (parsedUrl.pathname === '/logs') {
            const logs = await logger.getLogs();
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
