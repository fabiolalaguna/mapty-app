'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
// let map, mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, duration, distance) {
    this.coords = coords;
    this.duration = duration;
    this.distance = distance;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();

    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this;
  }
}

class Cycling extends Workout {
  // type = 'cycling';
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this;
  }
}

const run1 = new Running([20, -35], 12, 40, 642);
const cyc1 = new Cycling([24, -53], 45, 85, 350);
console.log(run1);
console.log(cyc1);

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    // Get data from localStorage
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    containerWorkouts.addEventListener(
      'click',
      this._moveMapToPopup.bind(this)
    );

    // "be aware of the this keyword with events inside classes" I'll just remember this for my entire life.
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(position);
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    // 13 es el zoom con que se muestra el mapa
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);

    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);
    // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //   attribution:
    //     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // }).addTo(map);

    this.#map.on('click', this._showForm.bind(this));

    // cargando los datos que estan en localStorage en el mapa Marker
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const positiveNumbers = function (...inputs) {
      return inputs.every(inp => inp >= +0);
    };

    // 1. Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // 2. If workout is running, create a running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // 2.1. Check if data is valid
      if (
        // !Number.isFinite(duration) ||
        // !Number.isFinite(distance) ||
        // !Number.isFinite(cadence) ||
        // !positiveNumbers(duration, distance, cadence)

        !validInputs(duration, distance, cadence) ||
        !positiveNumbers(duration, distance, cadence)
      )
        return alert('Data should be a positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // 3. If workout is cycling, create a cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // 3.1. Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !positiveNumbers(duration, distance)
      )
        return alert('Data should be a positive number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // 4. Add a new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    // 5. Render workout on map as maker
    // console.log(lat, lng);
    this._renderWorkoutMarker(workout);

    // 6. Render workout on a list
    this._renderWorkoutList(workout);

    // 7. Hide form + clear inputs fields
    this._hideForm();

    // Set localStorage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id=${workout.id}>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
    `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveMapToPopup(e) {
    const workoutElement = e.target.closest('.workout');
    console.log(workoutElement);

    if (!workoutElement) return;

    const workout = this.#workouts.find(
      work => work.id === workoutElement.dataset.id
    );
    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 1,
    });

    // USING PUBLIC INTERFACE
    // workout.click();
  }

  _setLocalStorage() {
    // volviendo los datos strings
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    // volviendo la data objetos
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    // Enviando los datos al array objeto de workouts como antes
    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkoutList(work));
  }

  _clearLocalStorage() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
// app._clearLocalStorage();
// console.log(app);
// app._getPosition();
//  ------->> /// llamando al metodo para activar la geolocalizacion, pero tambien lo podemos llamar dentro de la clase.
//Entonces, dentro de la clase, también tenemos un método que se llama automáticamente a medida que se carga la página.
// Y ese es el método del constructor. Por lo tanto, este método de constructor se llama inmediatamente cuando se crea un nuevo objeto a partir de esta clase y eso significa que el constructor también se ejecuta inmediatamente a medida que se carga la página.
