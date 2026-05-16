/**
 * Heat Index calculation based on Rothfusz formula
 * Converted to Celsius logic
 */
export function calculateHeatIndex(tempC: number, humidity: number): number {
  // Heat index is only valid for temperatures above 26.7°C (80°F)
  if (tempC < 26.7) return tempC;

  const T = (tempC * 9/5) + 32; // To Fahrenheit
  const rh = humidity;

  let hi = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (rh * 0.094));

  if (hi > 79) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh - 
         0.00683783 * T * T - 0.05481717 * rh * rh + 0.00122874 * T * T * rh + 
         0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;

    if (rh < 13 && T >= 80 && T <= 112) {
      hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (rh > 85 && T >= 80 && T <= 87) {
      hi += ((rh - 85) / 10) * ((87 - T) / 5);
    }
  }

  return (hi - 32) * 5/9; // Back to Celsius
}

export async function getWeatherData(query: string | { lat?: number, lon?: number, name?: string }) {
  try {
    let lat: number, lon: number, name: string;

    if (typeof query === 'object' && query.lat !== undefined && query.lon !== undefined) {
      lat = query.lat;
      lon = query.lon;
      
      if (query.name) {
        name = query.name;
      } else {
        // Reverse Geocoding attempt with search API might be tricky,
        // let's just use "Detected Location" or try to find name via a reverse lookup if possible.
        // Open-Meteo doesn't have a dedicated free reverse geocoding endpoint, 
        // so we'll use a placeholder and rely on coordinates for weather.
        name = "Detected Location";
        try {
           const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
           const revRes = await fetch(revUrl, { headers: { 'Accept-Language': 'en' } });
           const revData = await revRes.json();
           name = revData.address.city || revData.address.town || revData.address.village || revData.address.suburb || "Current Location";
        } catch(e) {
           console.error("Reverse geocoding failed", e);
        }
      }
    } else {
      // Fallback: Geocoding if only name string is provided or coordinates are missing
      const searchName = typeof query === 'object' ? query.name : query;
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl);
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("City not found. Please try searching with a more specific name.");
      }
      ({ latitude: lat, longitude: lon, name } = geoData.results[0]);
    }

    // 2. Weather Forecast
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,uv_index&daily=temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset&forecast_hours=24&timezone=auto`;
    
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error("Unable to fetch weather data. Please try again.");
    }
    const data = await weatherResponse.json();

    const formatLocalTime = (isoString: string) => {
      const parts = isoString.split('T')[1].split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12; 
      return `${h}:${m} ${ampm}`;
    };

    const hourlyData = data.hourly.time.map((time: string, i: number) => ({
      rawTime: time,
      time: formatLocalTime(time),
      temp: data.hourly.temperature_2m[i],
      humidity: data.hourly.relative_humidity_2m[i],
      heatIndex: calculateHeatIndex(data.hourly.temperature_2m[i], data.hourly.relative_humidity_2m[i]),
    }));

    // Calculate hazard window (hottest contiguous block)
    let hazardStart = -1;
    let hazardEnd = -1;
    let maxTemp = -100;
    hourlyData.forEach((h: any, i: number) => {
      if (h.heatIndex > maxTemp) {
        maxTemp = h.heatIndex;
        hazardStart = Math.max(0, i - 1);
        hazardEnd = Math.min(23, i + 2);
      }
    });

    // Calculate optimal window (coolest daylight block or just coolest block)
    let optimalStart = -1;
    let optimalEnd = -1;
    let minTemp = 1000;
    hourlyData.forEach((h: any, i: number) => {
      if (h.heatIndex < minTemp) {
        minTemp = h.heatIndex;
        optimalStart = Math.max(0, i - 1);
        optimalEnd = Math.min(23, i + 2);
      }
    });

    const hazardWindow = `${hourlyData[hazardStart]?.time} - ${hourlyData[hazardEnd]?.time}`;
    const optimalWindow = `${hourlyData[optimalStart]?.time} - ${hourlyData[optimalEnd]?.time}`;

    // 3. Process Data
    const weatherData = {
      city: name,
      timezone: data.timezone,
      current: {
        temp: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        apparentTemp: data.current.apparent_temperature,
        uvIndex: data.current.uv_index,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code,
        heatIndex: calculateHeatIndex(data.current.temperature_2m, data.current.relative_humidity_2m),
      },
      hourly: hourlyData,
      daily: {
        tempMax: data.daily.temperature_2m_max[0],
        tempMin: data.daily.temperature_2m_min[0],
        uvIndexMax: data.daily.uv_index_max[0],
        sunrise: formatLocalTime(data.daily.sunrise[0]),
        sunset: formatLocalTime(data.daily.sunset[0]),
      },
      windows: {
        hazard: hazardWindow,
        optimal: optimalWindow
      },
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: new Date().toISOString(),
    };

    return weatherData;
  } catch (error: any) {
    throw error;
  }
}

export async function searchCities(query: string, countryCode?: string) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=50&language=en&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    let results = data.results || [];
    
    if (countryCode && results.length > 0) {
      // Filter by country code to ensure we only show cities in the selected country
      results = results.filter((r: any) => 
        r.country_code?.toUpperCase() === countryCode.toUpperCase()
      );
    }
    
    return results;
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
}
