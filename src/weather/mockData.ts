// Mock data provider used as fallback by the service (no server)
export function getMockCurrent(city: string) {
  return {
    city,
    temperature: 18.3,
    conditions: "Partly cloudy",
    humidity: 55,
    windSpeed: 6.2,
  };
}

export function getMockForecast(city: string) {
  const today = new Date();
  const forecast: any[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const date = d.toISOString().slice(0, 10);
    forecast.push({
      date,
      temperature: { min: 15 + i, max: 22 + i },
      conditions: [
        "Sunny",
        "Partly cloudy",
        "Light rain",
        "Overcast",
        "Sunny intervals",
      ][i % 5],
    });
  }
  return forecast;
}

export function getMockLogs() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `Mock server logs (embedded)\n${ts} - Mock initialized\n${ts} - Prepared embedded forecast and current mock data\n${ts} - No real API calls proxied yet\n`;
}
