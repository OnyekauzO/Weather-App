import './App.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const IP_LOCATION_URL = 'https://ipapi.co/json/';

const formatTimestamp = (timestamp, options) => {
  if (!timestamp) return '—';

  const localTimestamp = timestamp.length === 10
    ? `${timestamp}T12:00:00Z`
    : `${timestamp}${timestamp.length === 16 ? ':00' : ''}Z`;

  return new Intl.DateTimeFormat(undefined, {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(localTimestamp));
};

const formatLocationTime = (date, timezone, options) => new Intl.DateTimeFormat(undefined, {
  ...options,
  ...(timezone ? { timeZone: timezone } : {}),
}).format(date);

const getWeatherDescription = (code) => {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Current weather';
};

const getWeatherEmoji = (code) => {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if ([3, 45, 48].includes(code)) return '☁️';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
};

const getErrorMessage = (error) => {
  if (error.message === 'LOCATION_NOT_FOUND') {
    return 'No matching location was found. Try a city name with its country.';
  }

  return 'Could not load weather data. Check your connection and try again.';
};

function App() {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationNotice, setLocationNotice] = useState('Finding your approximate location…');
  const [clock, setClock] = useState(() => new Date());
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const requestWeather = useCallback(async ({ lat, lon, name }, requestId) => {
    const response = await axios.get(FORECAST_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index',
        hourly: 'visibility,temperature_2m,precipitation_probability,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
        forecast_days: 8,
        timezone: 'auto',
        wind_speed_unit: 'kmh',
      },
    });

    if (requestId === requestSequence.current) {
      const timezoneName = response.data.timezone
        ?.split('/')
        .pop()
        .replace(/_/g, ' ');
      const daily = response.data.daily;
      const hourly = response.data.hourly;
      const current = response.data.current;
      const hourlyIndex = hourly?.time?.indexOf(current.time) ?? -1;
      const forecastStart = Math.max(hourlyIndex, 0);
      const hourlyForecast = hourly.time.slice(forecastStart, forecastStart + 24).map((time, index) => {
        const hourIndex = forecastStart + index;
        return {
          dt: time,
          temp: hourly.temperature_2m[hourIndex],
          precipitationProbability: hourly.precipitation_probability[hourIndex],
          weatherCode: hourly.weather_code[hourIndex],
        };
      });

      setWeather({
        timezone: response.data.timezone,
        name: name || timezoneName || 'Your Location',
        current: {
          dt: current.time,
          temp: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          wind_speed: current.wind_speed_10m,
          visibility: hourlyIndex >= 0 ? hourly.visibility[hourlyIndex] : undefined,
          uvi: current.uv_index,
          weather_code: current.weather_code,
          sunrise: daily.sunrise[0],
          sunset: daily.sunset[0],
        },
        hourly: hourlyForecast,
        daily: daily.time.map((date, index) => ({
          dt: date,
          temp: {
            max: daily.temperature_2m_max[index],
            min: daily.temperature_2m_min[index],
          },
          weather_code: daily.weather_code[index],
        })),
      });
    }
  }, []);

  const fetchWeatherByCoords = useCallback(async (lat, lon) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError('');

    try {
      await requestWeather({ lat, lon }, requestId);
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [requestWeather]);

  const fetchWeatherByCity = useCallback(async (city) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.get(GEOCODING_URL, {
        params: { name: city, count: 1, language: 'en', format: 'json' },
      });
      const place = data.results?.[0];

      if (!place) {
        throw new Error('LOCATION_NOT_FOUND');
      }

      const name = [place.name, place.admin1, place.country]
        .filter(Boolean)
        .join(', ');
      await requestWeather({
        lat: place.latitude,
        lon: place.longitude,
        name,
      }, requestId);
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [requestWeather]);

  const fetchWeatherByIp = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.get(IP_LOCATION_URL, { timeout: 8000 });
      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);

      if (data.error || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('IP_LOCATION_UNAVAILABLE');
      }

      const name = [data.city, data.region, data.country_name]
        .filter(Boolean)
        .join(', ');
      await requestWeather({ lat: latitude, lon: longitude, name }, requestId);

      if (requestId === requestSequence.current) {
        setLocationNotice(
          'Approximate location from your IP (shared with ipapi.co). Use precise location for GPS.'
        );
      }
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setLocationNotice('IP location was unavailable. Showing San Francisco instead.');
        await fetchWeatherByCity('San Francisco');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [fetchWeatherByCity, requestWeather]);

  useEffect(() => {
    fetchWeatherByIp();
  }, [fetchWeatherByIp]);

  const handleSearch = (event) => {
    event.preventDefault();
    const city = location.trim();
    if (city) {
      setLocationNotice('');
      fetchWeatherByCity(city);
    }
  };

  const handlePreciseLocation = () => {
    if (!navigator.geolocation) {
      setError('Precise device location is not supported by this browser.');
      return;
    }

    setError('');
    setLocationNotice('Requesting precise device location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationNotice('Using precise device location.');
        fetchWeatherByCoords(coords.latitude, coords.longitude);
      },
      () => {
        setError('Precise location was not available. Check browser permission settings.');
        setLocationNotice('Your approximate IP location remains in use.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const current = weather?.current;
  const hourlyForecast = weather?.hourly || [];
  const dailyForecast = weather?.daily?.slice(1, 8) || [];
  const uvIndex = typeof current?.uvi === 'number' && Number.isFinite(current.uvi)
    ? current.uvi
    : null;
  const uvProgress = uvIndex !== null
    ? Math.min(Math.max((uvIndex / 11) * 100, 0), 100)
    : 0;
  const windSpeed = current ? current.wind_speed.toFixed(1) : '—';
  const visibility = current?.visibility !== undefined
    ? `${(current.visibility / 1000).toFixed(1)} km`
    : '—';
  const condition = current ? getWeatherDescription(current.weather_code) : '';

  return (
    <div className='weather-app-page'>
      <div className='weather-app-shell'>
        <main className='dashboard-panel'>
        <header className='dashboard-header'>
          <form className='search-box' onSubmit={handleSearch}>
            <span className='search-icon' aria-hidden='true'>⌕</span>
            <input
              type='search'
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder='Search location'
              aria-label='Search by location'
            />
            <button type='submit' aria-label='Search weather' disabled={loading}>
              Search
            </button>
          </form>
          <button
            className='location-button'
            type='button'
            onClick={handlePreciseLocation}
            disabled={loading}
          >
            Use precise location
          </button>
        </header>
        {(error || loading || locationNotice) && (
          <p
            className={`dashboard-message${error ? ' dashboard-message-error' : ''}`}
            role={error ? 'alert' : 'status'}
          >
            {error || (loading ? 'Loading weather…' : locationNotice)}
          </p>
        )}

        <section className='top-grid'>
          <article className='card current-card'>
            <div className='card-topline'>
              <div className='weather-mark' aria-hidden='true'>
                {getWeatherEmoji(current?.weather_code)}
              </div>
            </div>

            <div className='hero-metrics'>
              <div className='temp-block'>
                <h1>{current ? Math.round(current.temp) : '—'}°C</h1>
              </div>
              <div className='stat-strip'>
                <span>Humidity {current ? `${current.humidity}%` : '—'}</span>
                <span>Visibility {visibility}</span>
              </div>
            </div>

            <p className='condition-label'>
              {condition ? condition.charAt(0).toUpperCase() + condition.slice(1) : 'Current weather'}
            </p>
            <div className='location-row'>
              <span className='pin' aria-hidden='true'>◉</span>
              <span>{weather?.name || 'Your Location'}</span>
            </div>
            <div className='date-row'>
              <span>
                {formatLocationTime(clock, weather?.timezone, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span aria-label='Current local time'>
                {formatLocationTime(clock, weather?.timezone, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </article>

          <article className='card small-card'>
            <div className='mini-header'>Wind Status</div>
            <div className='mini-chart chart-wave' aria-hidden='true'></div>
            <div className='mini-foot'>
              <strong>{windSpeed} km/h</strong>
              <span>
                {formatLocationTime(clock, weather?.timezone, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </article>

          <article className='card small-card'>
            <div className='mini-header'>UV Index</div>
            <div
              className='uv-ring'
              style={{ '--uv-progress': `${uvProgress}%` }}
              aria-label={`UV index ${uvIndex === null ? 'unavailable' : uvIndex.toFixed(1)}`}
            >
              <span>{uvIndex === null ? '—' : uvIndex.toFixed(1)}</span>
            </div>
            <div className='mini-foot'>
              <strong>{uvIndex === null ? '—' : uvIndex.toFixed(1)}</strong>
              <span>UV</span>
            </div>
          </article>

          <article className='card small-card'>
            <div className='mini-header'>Sunrise &amp; Sunset</div>
            <div className='sun-graph' aria-hidden='true'>
              <div className='sun-line'></div>
            </div>
            <div className='sun-times'>
              <div>
                <span className='sun-label'>Sunrise</span>
                <strong>
                  {formatTimestamp(current?.sunrise, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
              <div>
                <span className='sun-label'>Sunset</span>
                <strong>
                  {formatTimestamp(current?.sunset, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
            </div>
          </article>
        </section>

        <section className='bottom-grid'>
          <article className='card forecast-card'>
            <div className='section-head'>
              <h3>7 days Forecast</h3>
              <span>7 day</span>
            </div>

            <div className='forecast-list'>
              {dailyForecast.length ? dailyForecast.map((day) => (
                <div className='forecast-row' key={day.dt}>
                  <div className='temperature-group'>
                    <span className='forecast-icon' aria-hidden='true'>
                      {getWeatherEmoji(day.weather_code)}
                    </span>
                    <span className='forecast-temp'>
                      {Math.round(day.temp.max)}°/{Math.round(day.temp.min)}°
                    </span>
                  </div>
                  <span className='forecast-day'>
                    {formatTimestamp(day.dt, { weekday: 'long' })}
                  </span>
                </div>
              )) : (
                <p className='forecast-empty'>
                  {loading ? 'Loading forecast…' : 'Forecast will appear when weather data is available.'}
                </p>
              )}
            </div>
          </article>

          <article className='card hourly-card'>
            <div className='section-head'>
              <h3>Next 24 hours</h3>
              <span>Hourly forecast</span>
            </div>

            {hourlyForecast.length ? (
              <ul className='hourly-forecast' aria-label='Hourly weather forecast'>
                {hourlyForecast.map((hour, index) => (
                  <li className='hourly-item' key={hour.dt}>
                    <span className='hourly-time'>
                      {index === 0
                        ? 'Now'
                        : formatTimestamp(hour.dt, { hour: 'numeric' })}
                    </span>
                    <span className='hourly-icon' aria-hidden='true'>
                      {getWeatherEmoji(hour.weatherCode)}
                    </span>
                    <strong className='hourly-temp'>{Math.round(hour.temp)}°</strong>
                    <span className='hourly-rain'>
                      {typeof hour.precipitationProbability === 'number'
                        ? `${hour.precipitationProbability}%`
                        : '—'}
                      <span className='sr-only'> precipitation chance</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='forecast-empty'>
                {loading ? 'Loading hourly forecast…' : 'Hourly forecast will appear when weather data is available.'}
              </p>
            )}
          </article>
        </section>
        </main>
      </div>
      <footer className='app-footer'>
        <span>Designed by </span><span className='footer-name'>Onyeka Uzochukwu</span>
        {' | '}© {clock.getFullYear()} All rights reserved.
      </footer>
    </div>
  );
}

export default App;
