/**
 * IRRIGA-TECH OPEN-METEO WEATHER & SOLAR FORECAST SERVICE
 * 
 * Implements Blueprint Section 8.7 & Appendix B (Open-Meteo GFS Solar Radiation API).
 * Ingests solar irradiance (DNI, GHI), cloud cover, precipitation probability, and FAO-56 ET0.
 * Computes the optimal solar window for energy-aware irrigation scheduling (Algorithm B).
 */

export class WeatherService {
  constructor() {
    this.cache = null;
    this.cacheTime = 0;
    this.CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes cache
    // Default GPS Coordinates (Nanyuki / Mount Kenya Agrotech Zone)
    this.defaultLat = -0.0167;
    this.defaultLon = 37.0728;
  }

  /**
   * Fetch live weather and solar forecast from Open-Meteo
   */
  async getForecast(latitude = this.defaultLat, longitude = this.defaultLon) {
    const now = Date.now();
    if (this.cache && (now - this.cacheTime < this.CACHE_DURATION_MS)) {
      return this.cache;
    }

    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', latitude);
      url.searchParams.set('longitude', longitude);
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,cloud_cover');
      url.searchParams.set('hourly', 'direct_normal_irradiance,shortwave_radiation_instant,precipitation_probability,temperature_2m,relative_humidity_2m,cloud_cover,et0_fao_evapotranspiration');
      url.searchParams.set('forecast_days', '2');
      url.searchParams.set('timezone', 'auto');

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo status ${response.status}`);
      }

      const data = await response.json();
      const processed = this.processForecastData(data);
      this.cache = processed;
      this.cacheTime = now;
      return processed;
    } catch (err) {
      console.warn('[Open-Meteo Warning] Forecast fetch failed, using fallback estimate:', err.message);
      return this.getFallbackForecast();
    }
  }

  /**
   * Process raw Open-Meteo response into actionable agro-energy metrics
   */
  processForecastData(data) {
    const hourly = data.hourly || {};
    const times = hourly.time || [];
    const dni = hourly.direct_normal_irradiance || [];
    const ghi = hourly.shortwave_radiation_instant || [];
    const rain = hourly.precipitation_probability || [];
    const temps = hourly.temperature_2m || [];
    const et0 = hourly.et0_fao_evapotranspiration || [];

    const nowIso = new Date().toISOString().slice(0, 13); // Current hour match
    let currentIdx = times.findIndex(t => t.startsWith(nowIso));
    if (currentIdx === -1) currentIdx = 0;

    // Next 12 hours timeline
    const next12Hours = [];
    let peakSolarIndex = currentIdx;
    let maxIrradiance = 0;
    let rainExpectedNext6h = false;

    for (let i = currentIdx; i < Math.min(times.length, currentIdx + 12); i++) {
      const irradianceVal = Math.round(ghi[i] || dni[i] || 0);
      const rainProb = Math.round(rain[i] || 0);

      if (irradianceVal > maxIrradiance) {
        maxIrradiance = irradianceVal;
        peakSolarIndex = i;
      }
      if (i < currentIdx + 6 && rainProb > 60) {
        rainExpectedNext6h = true;
      }

      next12Hours.push({
        time: times[i],
        hourLabel: times[i].slice(11, 16),
        solarIrradianceW: irradianceVal,
        rainProbabilityPct: rainProb,
        tempC: Math.round(temps[i] || 25),
        et0Mm: et0[i] || 0.2
      });
    }

    const peakSolarTime = times[peakSolarIndex] ? times[peakSolarIndex].slice(11, 16) : '12:00';
    const currentSolarWattsEst = Math.round((ghi[currentIdx] || dni[currentIdx] || 0) * 0.22); // ~250W panel scale

    // Algorithm B Energy-Aware Recommendation
    let energyRecommendation = 'SOIL_DRY_ENERGY_OK';
    let energyAdviceText = 'Solar irradiance is strong. Optimal window for water pump execution.';

    if (rainExpectedNext6h) {
      energyRecommendation = 'WAIT_RAIN_WINDOW';
      energyAdviceText = 'Rain probability > 60% in next 6 hours. Consider deferring irrigation to save water and energy.';
    } else if (currentSolarWattsEst < 80 && maxIrradiance > 500) {
      energyRecommendation = 'WAIT_SOLAR_WINDOW';
      energyAdviceText = `Current solar is low. Peak solar window predicted at ${peakSolarTime} (${maxIrradiance} W/m²). Defer non-critical pumping until peak window.`;
    }

    return {
      provider: 'Open-Meteo GFS Weather & Solar API',
      timestamp: Date.now(),
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation,
        region: 'Kenya / Rift Agrotech Corridor'
      },
      current: {
        tempC: data.current?.temperature_2m || 26.5,
        humidityPct: data.current?.relative_humidity_2m || 65,
        cloudCoverPct: data.current?.cloud_cover || 20,
        solarRadiationW: ghi[currentIdx] || 450,
        estimatedPvWatts: currentSolarWattsEst
      },
      solarWindow: {
        peakTime: peakSolarTime,
        peakIrradianceW: maxIrradiance,
        rainRiskNext6h: rainExpectedNext6h,
        energyStateCode: energyRecommendation,
        energyAdviceText
      },
      hourlyForecast: next12Hours
    };
  }

  /**
   * Deterministic fallback when internet is offline
   */
  getFallbackForecast() {
    const currentHour = new Date().getHours();
    const isDay = currentHour >= 7 && currentHour <= 17;
    const estSolar = isDay ? Math.min(850, Math.max(100, Math.sin(((currentHour - 6) / 12) * Math.PI) * 850)) : 0;

    return {
      provider: 'Open-Meteo Offline Baseline (Model Fallback)',
      timestamp: Date.now(),
      location: { latitude: this.defaultLat, longitude: this.defaultLon, region: 'Offline Model' },
      current: {
        tempC: 26.0,
        humidityPct: 65,
        cloudCoverPct: 25,
        solarRadiationW: Math.round(estSolar),
        estimatedPvWatts: Math.round(estSolar * 0.22)
      },
      solarWindow: {
        peakTime: '12:30',
        peakIrradianceW: 780,
        rainRiskNext6h: false,
        energyStateCode: 'SOIL_DRY_ENERGY_OK',
        energyAdviceText: 'Estimated daytime solar window is active.'
      },
      hourlyForecast: []
    };
  }
}

export const weatherService = new WeatherService();
