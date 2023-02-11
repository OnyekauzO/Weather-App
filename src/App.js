import logo from './logo.svg';
import './App.css';
import React, {useState, useEffect} from 'react'
import axios from 'axios';

function App() {
  const [weather, setweather] = useState({});
  const [location, setlocation] = useState("");
  const API_KEY = "fb4bf41ee9a477d986dc13e46abfd3ba"
  let endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=${API_KEY}`
  // let coordinates = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`
  useEffect(() => {
    const getLocation = () =>{
      navigator.geolocation.getCurrentPosition((response)=>{
        console.log(response.coords.latitude)
        console.log(response.coords.longitude)
      })
    }
    getLocation()
    // findCoordinates()
  }, [])
  // useEffect(() => {
  //   fetchMovie();
  // }, [POPULAR_MOVIES])

  // async function fetchMovie (){
  //   await axios.get(POPULAR_MOVIES)
  //   .then((response)=> {
  //     console.log(response.data.results[Math.floor(Math.random()*response.data.results.length-1)]);
  //     setmovies(response.data.results[Math.floor(Math.random()*response.data.results.length-1)]);
  //   });
  // }
  // const findCoordinates = async () => {
  //   await axios.get(coordinates)
  //   .then((response) => {
  //     console.log(response.data)
  //   }).catch((error) => {
  //     console.log(error)
  //   })
  // }
  const searchCity = (e)=>{
    if (e.key === "Enter") {
      setlocation("")
      callApi();
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
    // <div className="App">
    //   <header className="App-header">
    //     <img src={logo} className="App-logo" alt="logo" />
    //     <p>
    //       Edit <code>src/App.js</code> and save to reload.
    //     </p>
    //     <a
    //       className="App-link"
    //       href="https://reactjs.org"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       Learn React
    //     </a>
    //   </header>
    // </div>
  );
}

export default App;
