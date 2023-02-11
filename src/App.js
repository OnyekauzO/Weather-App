import logo from './logo.svg';
import './App.css';
import React, {useState, useEffect} from 'react'
import axios from 'axios';

function App() {
  const [weather, setweather] = useState({});
  const [location, setlocation] = useState("");
  const API_KEY = "fb4bf41ee9a477d986dc13e46abfd3ba"
  let endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=fb4bf41ee9a477d986dc13e46abfd3ba`
  
  const searchCity = (e)=>{
    if (e.key === "Enter") {
      setlocation("")
      callApi();
      // if (weather.main.temp.toFixed() ){
      //   alert("Please enter")
      // }
    }
  }
  const callApi = () => {
    console.log('Hello');
    axios.get(endpoint)
    .then((response) => {
      console.log(response.data)
      setweather(response.data);
    }).catch((error) => {
        console.log(error)
    })
  }
  return (
    <div className='myContainer'>
      <div className='search'>
        <input className='searchBar' type="search" value={location} 
        onChange={e => setlocation(e.target.value)} 
        onKeyDown={searchCity} 
        placeholder="Search Location"/>
      </div>
      <div className='all_info'>
        {/* <h1>{weather.name}</h1>
        {weather.main ? <h1>{weather.main.temp}</h1> : null} */}
        <div className="main_info">
          <h2 className=''>{weather.name}</h2>
          {/* <h1 className='mb-0'>&21°C</h1> */}
          {weather.main ? <h1 className='main_temperature'>{weather.main.temp.toFixed()} °C</h1> : null}
          {/* {weather.main && weather.main.temp.toFixed() == -0 ? <h1 className='mb-0'>{weather.main.temp.toFixed()*-1} °C</h1> : <h1 className='mb-0'>{weather.main.temp.toFixed()} °C</h1>} */}
          {/* {weather.main.temp.toFixed() == -0 ? <h1 className='mb-0'>{weather.main.temp.toFixed()*-1} °C</h1> : null} */}
          {/* <h6 className='text-muted'>{weather.main.temp_max}°/{weather.main.temp_min}° Feels like {weather.main.feels_like}°</h6> */}
          {weather.main ? <h6 className='feels_like'>{weather.main.temp_max.toFixed()}°/{weather.main.temp_min.toFixed()}° Feels like {weather.main.feels_like.toFixed()}</h6>: null}
          {weather.weather ? <h2 className='conditions'>{weather.weather[0].main}</h2> : null}
          {/* {weather.weather ? <h2>{weather.weather[0].icon}</h2> : null} */}
        </div>
        {weather.name != undefined &&
          <div className='bottom_info'>
            <div className='humidity extra_info fs-3'>
              <div>Humidity</div>
              {/* <div className='fs-5 fw-bold'>28%</div> */}
              {weather.main ? <div className='fs-5 fw-bold'>{weather.main.humidity.toFixed()}%</div> : null}
            </div>
            <div className='wind extra_info fs-3'>
              <div>Wind</div>
              {/* <div className='fs-5 fw-bold'>{weather.wind.speed}m/s</div> */}
              {weather.main ? <div className='fs-5 fw-bold'>{weather.wind.speed.toFixed(1)}m/s</div> : null}
            </div>
            <div className='wind extra_info fs-3'>
              <div>Visibility</div>
              <div className='fs-5 fw-bold'>{weather.visibility}km</div>
            </div>
          </div>
        }
      </div>
    </div>
  );
}

export default App;
