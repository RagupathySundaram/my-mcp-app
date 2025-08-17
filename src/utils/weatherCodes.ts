// Weather code mappings and helper to format condition labels
export const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Heavy drizzle",
  56: "Light freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export const getConditionLabel = (cond: any) => {
  if (cond === undefined || cond === null) return "N/A";
  // If it's already a number (or numeric string), map it
  const asNumber = Number(cond);
  if (!Number.isNaN(asNumber)) {
    const label = WEATHER_CODE_MAP[asNumber] ?? "Unknown";
    return `${label} (${asNumber})`;
  }

  // If it's a string that embeds a code like 'code:51' or '51', extract the first number
  if (typeof cond === "string") {
    const m = cond.match(/(\d{1,3})/);
    if (m) {
      const code = Number(m[1]);
      const label = WEATHER_CODE_MAP[code] ?? "Unknown";
      return `${label} (${code})`;
    }
    // otherwise return the string as-is
    return cond;
  }

  return String(cond);
};
