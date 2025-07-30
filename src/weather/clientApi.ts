import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const printHelp = () => {
    console.log('\n🌤️ Weather API Client Commands:');
    console.log('-----------------------------');
    console.log('🌡️  weather <city>     - Get current weather (real API)');
    console.log('📅 forecast <city>    - Get 5-day forecast (real API)');
    console.log('❓ help              - Show this help message');
    console.log('👋 quit              - Exit the program\n');
};

async function getCurrentWeather(city: string) {
    const url = `http://localhost:3002/current?city=${encodeURIComponent(city)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    return await resp.json();
}

async function getForecast(city: string) {
    const url = `http://localhost:3002/forecast?city=${encodeURIComponent(city)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    return await resp.json();
}

async function main() {
    console.log('\n🌤️ Welcome to Real Weather API Client!');
    printHelp();

    rl.on('line', async (input) => {
        if (input.toLowerCase() === 'quit') {
            console.log('👋 Goodbye!');
            rl.close();
            process.exit(0);
        }

        const [command, ...args] = input.split(' ');
        const city = args.join(' ');

        try {
            switch (command.toLowerCase()) {
                case 'weather':
                    if (!city) {
                        console.log('❌ Please provide a city name');
                        break;
                    }
                    const weather = await getCurrentWeather(city);
                    console.log('\n🌡️ Current Weather (API):');
                    console.log('----------------------');
                    Object.entries(weather).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
                    break;
                case 'forecast':
                    if (!city) {
                        console.log('❌ Please provide a city name');
                        break;
                    }
                    const forecast = await getForecast(city);
                    console.log('\n📅 5-Day Forecast (API):');
                    console.log('---------------------');
                    if (forecast.time && forecast.temperature_2m_max) {
                        for (let i = 0; i < forecast.time.length; i++) {
                            console.log(`  ${forecast.time[i]}: ${forecast.temperature_2m_min[i]}°C - ${forecast.temperature_2m_max[i]}°C`);
                        }
                    } else {
                        console.log('  No forecast data available');
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
