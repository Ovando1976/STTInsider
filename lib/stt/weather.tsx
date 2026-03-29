import type { WeatherDay } from "@/types/stt";

function weatherCodeToIcon(code: number): string {
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 67) return "🌦️";
  return "🌧️";
}

export async function getStThomasWeather(): Promise<WeatherDay[]> {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=18.3419&longitude=-64.9307&daily=weathercode,temperature_2m_max&timezone=auto&temperature_unit=fahrenheit",
      { next: { revalidate: 1800 } }
    );

    if (!res.ok) {
      return [];
    }

    const data = await res.json();

    return data.daily.time.slice(0, 3).map((date: string, index: number) => ({
      label:
        index === 0
          ? "Today"
          : new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      icon: weatherCodeToIcon(data.daily.weathercode[index]),
      high: Math.round(data.daily.temperature_2m_max[index]),
    }));
  } catch {
    return [];
  }
}
