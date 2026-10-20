# Weather App

## Weather data

The app uses ipapi.co to estimate the visitor's location from their IP address on startup, then uses Open-Meteo's geocoding and forecast APIs for city search, current conditions, 24-hour temperature and precipitation forecasts, hourly visibility, UV index, sunrise, sunset, and daily forecasts. The IP-based estimate is approximate; visitors can choose **Use precise location** to request browser GPS permission instead. The IP address is sent to ipapi.co for the estimate. No API key or environment configuration is required.

The forecast request includes today and the next seven calendar days; the dashboard displays the next seven. Check Open-Meteo's terms for usage and attribution requirements before deploying the app commercially.
