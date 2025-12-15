import React, { useEffect, useState } from "react";

/**
 * WeatherWidget.jsx
 * - Uses Open-Meteo public API: no API key required.
 * - Props:
 *    lat, lon -> optional coordinates to override geolocation
 *    pollInterval -> ms between refreshes (default 300000 = 5m)
 *
 * Example: <WeatherWidget lat={28.7041} lon={77.1025} />
 */

const DEFAULT = { lat: 22.5937, lon: 78.9629 }; // center of India fallback

function mapWeatherCode(code){
  // simplified mapping from open-meteo codes to text
  const sunny = [0];
  const cloudy = [1,2];
  const overcast = [3];
  const fog = [45,48];
  const drizzle = [51,53,55,56,57];
  const rain = [61,63,65,66,67,80,81,82];
  const snow = [71,73,75,77,85,86];
  const thunder = [95,96,99];

  if (sunny.includes(code)) return "Clear";
  if (cloudy.includes(code)) return "Partly cloudy";
  if (overcast.includes(code)) return "Overcast";
  if (fog.includes(code)) return "Fog";
  if (drizzle.includes(code)) return "Drizzle";
  if (rain.includes(code)) return "Rain";
  if (snow.includes(code)) return "Snow";
  if (thunder.includes(code)) return "Thunderstorm";
  return "Unknown";
}

export default function WeatherWidget({ lat, lon, pollInterval = 300000 }) {
  const [coords, setCoords] = useState({ lat: lat || null, lon: lon || null });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (coords.lat && coords.lon) fetchWeather();
    else {
      // try geolocation
      if (navigator.geolocation && !lat && !lon) {
        navigator.geolocation.getCurrentPosition(
          (p) => { setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }); },
          (e) => { console.warn("geolocation failed", e); setCoords({ lat: DEFAULT.lat, lon: DEFAULT.lon }); },
          { timeout: 8000 }
        );
      } else {
        setCoords({ lat: lat || DEFAULT.lat, lon: lon || DEFAULT.lon });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coords.lat) return;
    fetchWeather();
    const t = setInterval(fetchWeather, pollInterval);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lon]);

  async function fetchWeather(){
    if (!coords.lat) return;
    setLoading(true); setErr("");
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,precipitation&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      const cur = j.current_weather || {};
      const summary = mapWeatherCode(cur.weathercode);
      setData({
        temperature: cur.temperature,
        windspeed: cur.windspeed,
        direction: cur.winddirection,
        weathercode: cur.weathercode,
        summary,
        fetchedAt: new Date().toLocaleTimeString()
      });
    } catch (e) {
      console.error(e);
      setErr("Weather fetch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700 }}>Local Weather</div>
          <div className="small">Auto updates every {Math.round(pollInterval/60000)} min</div>
        </div>
        <div style={{ textAlign: "right" }}>
          {loading ? <div className="small">Updating…</div> : data ? <div style={{ fontWeight: 700, fontSize: 18 }}>{Math.round(data.temperature)}°C</div> : <div className="small">—</div>}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {err && <div className="small" style={{ color: "var(--danger)" }}>{err}</div>}

        {data && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 36 }}>{data.weathercode === 0 ? "☀️" : data.weathercode >= 95 ? "⛈️" : data.weathercode >= 61 ? "🌧️" : "☁️"}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{data.summary}</div>
              <div className="small">Wind {Math.round(data.windspeed || 0)} km/h • Updated {data.fetchedAt}</div>
            </div>
          </div>
        )}

        {!data && !loading && <div className="small" style={{ marginTop: 8 }}>No weather data yet — allow location access or set coordinates.</div>}
      </div>
    </div>
  );
}
