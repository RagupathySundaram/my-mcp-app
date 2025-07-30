import * as http from 'http';
import * as url from 'url';
import fetch from 'node-fetch';

// Helper to get latitude/longitude for a city using Open-Meteo geocoding
async function getLatLon(city: string): Promise<{ lat: number, lon: number } | null> {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
    const resp = await fetch(geoUrl);
    const data = await resp.json();
    if (data.results && data.results.length > 0) {
        return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
    return null;
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    const city = parsedUrl.query.city as string;

    if (!city) {
        res.writeHead(400);
        res.end('City parameter is required');
        return;
    }

    if (parsedUrl.pathname === '/current') {
        try {
            const coords = await getLatLon(city);
            if (!coords) throw new Error('City not found');
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
            const weatherResp = await fetch(weatherUrl);
            const weatherData = await weatherResp.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ city, ...weatherData.current_weather }));
        } catch (error: any) {
            res.writeHead(500);
            res.end(`Error: ${error.message}`);
        }
    } else if (parsedUrl.pathname === '/forecast') {
        try {
            const coords = await getLatLon(city);
            if (!coords) throw new Error('City not found');
            const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=5&timezone=auto`;
            const forecastResp = await fetch(forecastUrl);
            const forecastData = await forecastResp.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ city, ...forecastData.daily }));
        } catch (error: any) {
            res.writeHead(500);
            res.end(`Error: ${error.message}`);
        }
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 3002;
server.listen(PORT, () => {
    console.log(`Weather API Server running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('- GET  /current?city=<cityname>    - Get current weather (real API)');
    console.log('- GET  /forecast?city=<cityname>   - Get 5-day forecast (real API)');
});
