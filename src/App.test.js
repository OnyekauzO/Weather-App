import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

jest.mock('axios');

const ipLocationResponse = {
  city: 'New York',
  region: 'New York',
  country_name: 'United States',
  latitude: 40.7,
  longitude: -74,
};

const hourlyTimes = Array.from({ length: 36 }, (_, index) => (
  new Date(Date.UTC(2026, 9, 20, 12 + index)).toISOString().slice(0, 16)
));

const weatherResponse = {
  timezone: 'America/New_York',
  current: {
    time: '2026-10-20T12:00',
    temperature_2m: 21.6,
    relative_humidity_2m: 62,
    wind_speed_10m: 4,
    uv_index: 6.4,
    weather_code: 0,
  },
  hourly: {
    time: hourlyTimes,
    visibility: Array(hourlyTimes.length).fill(10000),
    temperature_2m: hourlyTimes.map((_, index) => 21.6 + index / 2),
    precipitation_probability: hourlyTimes.map((_, index) => (index * 5) % 100),
    weather_code: Array(hourlyTimes.length).fill(0),
  },
  daily: {
    time: Array.from({ length: 8 }, (_, index) => (
      new Date(Date.UTC(2026, 9, 20 + index)).toISOString().slice(0, 10)
    )),
    sunrise: Array.from({ length: 8 }, (_, index) => (
      `${new Date(Date.UTC(2026, 9, 20 + index)).toISOString().slice(0, 10)}T06:00`
    )),
    sunset: Array.from({ length: 8 }, (_, index) => (
      `${new Date(Date.UTC(2026, 9, 20 + index)).toISOString().slice(0, 10)}T18:00`
    )),
    temperature_2m_max: Array.from({ length: 8 }, (_, index) => 24 + index),
    temperature_2m_min: Array.from({ length: 8 }, (_, index) => 15 + index),
    weather_code: Array(8).fill(0),
  },
};

beforeEach(() => {
  axios.get.mockReset();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn(),
    },
  });
});

const mockInitialIpWeather = (forecast = weatherResponse) => {
  axios.get
    .mockResolvedValueOnce({ data: ipLocationResponse })
    .mockResolvedValueOnce({ data: forecast });
};

test('loads and displays live current conditions and a seven-day forecast', async () => {
  mockInitialIpWeather();

  render(<App />);

  expect(screen.getByPlaceholderText(/search location/i)).toBeInTheDocument();
  const footer = screen.getByRole('contentinfo');
  expect(footer).toHaveTextContent(
    `Designed by Onyeka Uzochukwu | © ${new Date().getFullYear()} All rights reserved.`
  );
  expect(footer.closest('.weather-app-shell')).toBeNull();
  expect(screen.getByText('Designed by Onyeka Uzochukwu')).toHaveClass('footer-name');
  expect(await screen.findByText('New York, New York, United States')).toBeInTheDocument();
  expect(await screen.findByText(/Approximate location from your IP/)).toBeInTheDocument();
  expect(screen.getByLabelText('Current local time')).toHaveTextContent(
    new Intl.DateTimeFormat(undefined, {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date())
  );
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(screen.getByText('22°C')).toBeInTheDocument();
  expect(screen.getAllByText('6.4')).toHaveLength(2);
  expect(parseFloat(screen.getByLabelText('UV index 6.4').style.getPropertyValue('--uv-progress')))
    .toBeCloseTo((6.4 / 11) * 100, 8);
  expect(screen.getByText('Sunrise').nextElementSibling).toHaveTextContent(/6:00\s*a\.m\./i);
  expect(screen.getByText('Sunset').nextElementSibling).toHaveTextContent(/6:00\s*p\.m\./i);
  expect(screen.getByText('7 days Forecast')).toBeInTheDocument();
  expect(screen.getByText('Next 24 hours')).toBeInTheDocument();
  expect(screen.getByText('Hourly forecast')).toBeInTheDocument();
  expect(screen.getByRole('list', { name: /hourly weather forecast/i }).children)
    .toHaveLength(24);
  expect(screen.getByText('Now')).toBeInTheDocument();
  expect(screen.getAllByText('22°')).toHaveLength(2);

  await waitFor(() => {
    expect(screen.getAllByText(/°\/\d+°/)).toHaveLength(7);
  });
  expect(axios.get).toHaveBeenNthCalledWith(
    1,
    'https://ipapi.co/json/',
    { timeout: 8000 }
  );
  expect(axios.get).toHaveBeenNthCalledWith(
    2,
    'https://api.open-meteo.com/v1/forecast',
    expect.objectContaining({
      params: expect.objectContaining({
        latitude: 40.7,
        longitude: -74,
        current: expect.stringContaining('uv_index'),
        hourly: expect.stringContaining('precipitation_probability'),
        forecast_days: 8,
        timezone: 'auto',
      }),
    })
  );
  expect(axios.get.mock.calls[1][1].params).not.toHaveProperty('appid');
});

test('shows a valid zero UV index and handles a missing UV value', async () => {
  mockInitialIpWeather({
    ...weatherResponse,
    current: { ...weatherResponse.current, uv_index: 0 },
  });

  const { unmount } = render(<App />);

  expect(await screen.findByLabelText('UV index 0.0')).toBeInTheDocument();
  expect(screen.getAllByText('0.0')).toHaveLength(2);
  expect(await screen.findByText(/Approximate location from your IP/)).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /search weather/i })).toBeEnabled();
  });

  unmount();
  mockInitialIpWeather({
    ...weatherResponse,
    current: { ...weatherResponse.current, uv_index: null },
  });
  render(<App />);
  expect(await screen.findByLabelText('UV index unavailable')).toBeInTheDocument();
  expect(screen.getByLabelText('UV index unavailable').querySelector('span')).toHaveTextContent('—');
  expect(await screen.findByText(/Approximate location from your IP/)).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /search weather/i })).toBeEnabled();
  });
});

test('geocodes a searched city before requesting its forecast', async () => {
  axios.get
    .mockResolvedValueOnce({ data: ipLocationResponse })
    .mockResolvedValueOnce({ data: weatherResponse })
    .mockResolvedValueOnce({
      data: {
        results: [{
          name: 'London',
          admin1: 'England',
          country: 'United Kingdom',
          latitude: 51.5,
          longitude: -0.1,
        }],
      },
    })
    .mockResolvedValueOnce({
      data: { ...weatherResponse, timezone: 'Europe/London' },
    });

  render(<App />);
  expect(await screen.findByText('New York, New York, United States')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /search weather/i })).toBeEnabled();
  });

  const search = screen.getByRole('searchbox', { name: /search by location/i });
  fireEvent.change(search, { target: { value: 'London' } });
  fireEvent.submit(search.closest('form'));

  expect(await screen.findByText('London, England, United Kingdom')).toBeInTheDocument();
  expect(screen.queryByText(/showing weather for london/i)).not.toBeInTheDocument();
  expect(axios.get).toHaveBeenNthCalledWith(
    3,
    'https://geocoding-api.open-meteo.com/v1/search',
    expect.objectContaining({
      params: { name: 'London', count: 1, language: 'en', format: 'json' },
    })
  );
  expect(axios.get).toHaveBeenNthCalledWith(
    4,
    'https://api.open-meteo.com/v1/forecast',
    expect.objectContaining({
      params: expect.objectContaining({ latitude: 51.5, longitude: -0.1 }),
    })
  );
});

test('requests precise location only after the user chooses it', async () => {
  mockInitialIpWeather();
  navigator.geolocation.getCurrentPosition.mockImplementationOnce((onSuccess) => onSuccess({
    coords: { latitude: 47.6, longitude: -122.3 },
  }));
  axios.get.mockResolvedValueOnce({ data: weatherResponse });

  render(<App />);
  expect(await screen.findByText('New York, New York, United States')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /search weather/i })).toBeEnabled();
  });
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /use precise location/i }));

  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledTimes(3);
  });
  expect(await screen.findByText('Using precise device location.')).toBeInTheDocument();
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    { enableHighAccuracy: true, timeout: 10000 }
  );
  expect(axios.get).toHaveBeenNthCalledWith(
    3,
    'https://api.open-meteo.com/v1/forecast',
    expect.objectContaining({
      params: expect.objectContaining({ latitude: 47.6, longitude: -122.3 }),
    })
  );
});

test('falls back to a default city when IP location lookup fails', async () => {
  axios.get
    .mockRejectedValueOnce(new Error('IP lookup failed'))
    .mockResolvedValueOnce({
      data: {
        results: [{
          name: 'San Francisco',
          admin1: 'California',
          country: 'United States',
          latitude: 37.77,
          longitude: -122.42,
        }],
      },
    })
    .mockResolvedValueOnce({ data: weatherResponse });

  render(<App />);

  expect(await screen.findByText('San Francisco, California, United States')).toBeInTheDocument();
  expect(await screen.findByText(/IP location was unavailable/)).toBeInTheDocument();
  expect(axios.get).toHaveBeenNthCalledWith(
    1,
    'https://ipapi.co/json/',
    { timeout: 8000 }
  );
  expect(axios.get).toHaveBeenNthCalledWith(
    2,
    'https://geocoding-api.open-meteo.com/v1/search',
    expect.objectContaining({
      params: expect.objectContaining({ name: 'San Francisco' }),
    })
  );
});
