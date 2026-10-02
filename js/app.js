const locations = [
  {
    id: 'dti',
    name: 'Département Technologies de l’Informatique',
    short: 'DTI',
    type: 'department',
    x: 82,
    y: 88.8,
    desc: 'Department of Information Technology — south-east block.'
  },
  {
    id: 'seg',
    name: 'Département Sciences Économiques et Gestion',
    short: 'SEG',
    type: 'department',
    x: 54.2,
    y: 89,
    desc: 'Economics and Management department — south campus block.'
  },
  {
    id: 'gm',
    name: 'Département Génie Mécanique',
    short: 'GM',
    type: 'department',
    x: 79,
    y: 29.8,
    desc: 'Mechanical Engineering department — north-east campus zone.'
  },
  {
    id: 'ge',
    name: 'Département Génie Électrique',
    short: 'GE',
    type: 'department',
    x: 48.8,
    y: 36.2,
    desc: 'Electrical Engineering department — adjacent to the library block.'
  },

  {
    id: 'library',
    name: 'Bibliothèque',
    short: 'BIB',
    type: 'common',
    x: 49.5,
    y: 44.2,
    desc: 'Campus library in the north-west academic block.'
  },
  {
    id: 'amphi',
    name: 'Amphithéâtre & buvette',
    short: 'AMP',
    type: 'common',
    x: 40.3,
    y: 61.5,
    desc: 'Amphitheatre and refreshment area on the west side.'
  },
  {
    id: 'admin',
    name: 'Administration',
    short: 'ADM',
    type: 'common',
    x: 77.7,
    y: 61.6,
    desc: 'Administrative services building, east of the central courtyard.'
  },
  {
    id: 'custom-1790180404979',
    name: 'Clubs',
    short: 'CLB',
    type: 'common',
    x: 67.6,
    y: 81.5,
    desc: 'Clubs integ.'
  },

  {
    id: 'machine',
    name: 'Hall Machine',
    short: 'HM',
    type: 'lab',
    x: 63.6,
    y: 32.5,
    desc: 'Mechanical workshop and machine hall.'
  },
  {
    id: 'cao',
    name: 'Lab CAO',
    short: 'CAO',
    type: 'lab',
    x: 74.8,
    y: 36.1,
    desc: 'Computer-aided design laboratory.'
  },
  {
    id: 'ge2',
    name: 'Lab GE2',
    short: 'GE2',
    type: 'lab',
    x: 78.9,
    y: 36.2,
    desc: 'Electrical Engineering laboratory GE2.'
  },
  {
    id: 'cnd',
    name: 'Lab CND',
    short: 'CND',
    type: 'lab',
    x: 81.2,
    y: 41.1,
    desc: 'Non-destructive testing laboratory.'
  },
  {
    id: 'systeme',
    name: 'Lab Système',
    short: 'SYS',
    type: 'lab',
    x: 75,
    y: 45.8,
    desc: 'Systems laboratory.'
  },
  {
    id: 'langue',
    name: 'Labo de langue',
    short: 'LANG',
    type: 'lab',
    x: 46.6,
    y: 51,
    desc: 'Language laboratory.'
  },
  {
    id: 'lab2',
    name: 'Lab 2 AII',
    short: 'AII',
    type: 'lab',
    x: 76.2,
    y: 72.9,
    desc: 'Automation and Industrial IT laboratory.'
  },
  {
    id: 'lab3',
    name: 'Lab 3 DPI',
    short: 'DPI',
    type: 'lab',
    x: 81.3,
    y: 72.9,
    desc: 'DPI laboratory.'
  },
  {
    id: 'lab1',
    name: 'Lab 1 SEI',
    short: 'SEI',
    type: 'lab',
    x: 75.7,
    y: 82.2,
    desc: 'Industrial Systems laboratory.'
  },
  {
    id: 'lab4',
    name: 'Lab 4 CFI',
    short: 'CFI',
    type: 'lab',
    x: 81,
    y: 82.1,
    desc: 'CFI laboratory.'
  },

  ...['104', '103', '102', '101'].map((n, i) => ({
    id: 's' + n,
    name: 'Salle ' + n,
    short: n,
    type: 'room',
    x: [58.6, 62.2, 66, 69][i],
    y: 44.1,
    desc: 'Teaching room in the north classroom row.'
  })),

  ...['105', '106', '107', '108'].map((n, i) => ({
    id: 's' + n,
    name: 'Salle ' + n,
    short: n,
    type: 'room',
    x: 53,
    y: [51, 54.3, 63.4, 67.2][i],
    desc: 'Teaching room in the west classroom row.'
  })),

  ...['116', '115'].map((n, i) => ({
    id: 's' + n,
    name: 'Salle ' + n,
    short: n,
    type: 'room',
    x: [48.8, 53.4][i],
    y: 74.3,
    desc: 'Teaching room in the SEG block.'
  })),

  ...['109', '110', '111', '112'].map((n, i) => ({
    id: 's' + n,
    name: 'Salle ' + n,
    short: n,
    type: 'room',
    x: [58.6, 62.2, 66, 69.5][i],
    y: 74.3,
    desc: 'Teaching room in the south classroom row.'
  })),

  {
    id: 'eep',
    name: 'EEP',
    short: 'EEP',
    type: 'room',
    x: 51,
    y: 82,
    desc: 'EEP rooms in the SEG department block.'
  }
];

const label = {
  department: 'Department',
  room: 'Teaching room',
  lab: 'Laboratory',
  common: 'Campus service'
};

const typeLabel = type =>
  window.siteTypeLabels?.[type] || label[type];

try {
  const savedLocations = JSON.parse(localStorage.getItem('iset-locations') || 'null');
  if (Array.isArray(savedLocations) && savedLocations.length) {
    locations.splice(0, locations.length, ...savedLocations);
  }
} catch (error) {
  console.warn('Saved locations could not be loaded.', error);
}


async function loadSharedCampusData() {
  try {
    const binId = window.JSONBIN_CONFIG?.BIN_ID;
    if (!binId || binId.includes('PASTE_YOUR')) throw new Error('JSONBin BIN_ID is not configured');
    const accessKey = window.JSONBIN_CONFIG?.ACCESS_KEY || window.JSONBIN_CONFIG?.UPDATE_ACCESS_KEY;
    if (!accessKey || accessKey.includes('PASTE_YOUR')) throw new Error('JSONBin ACCESS_KEY is not configured');
    const response = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(binId)}/latest?ts=${Date.now()}`, {
      headers: { 'X-Access-Key': accessKey },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const data = payload.record || payload;

    if (Array.isArray(data.locations) && data.locations.length) {
      locations.splice(0, locations.length, ...data.locations);
      localStorage.setItem('iset-locations', JSON.stringify(data.locations));
    }
    if (Array.isArray(data.routePoints)) {
      localStorage.setItem('iset-route-points', JSON.stringify(data.routePoints));
    }
    if (data.routesByLocation && typeof data.routesByLocation === 'object') {
      localStorage.setItem('iset-routes-by-location', JSON.stringify(data.routesByLocation));
    }
    if (data.routeSettings) {
      localStorage.setItem('iset-route-settings', JSON.stringify(data.routeSettings));
    }

    window.campusLocations = locations;
    render();
  } catch (error) {
    console.warn('JSONBin data unavailable; using bundled/local data.', error);
  }
}

window.campusLocations = locations;

document.addEventListener('siteLanguageChanged', () => render());

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const markers = $('#markers');
const results = $('#results');
const search = $('#search');
const canvas = $('#mapCanvas');
const viewport = $('#mapViewport');
const card = $('#placeCard');
const path = $('#routePath');
const start = $('#routeStart');
const routeStatus = $('#routeStatus');
const routeStatusName = $('#routeStatusName');

let filter = 'all';
let query = '';
let selected = null;

let scale = 1;
let panX = 0;
let panY = 0;

let drag = null;
let route = false;
let quizActive = false;
let quizAnswered = false;
let quizTarget = null;
let quizScore = 0;
let quizRound = 0;
let quizPool = [];

const mapCropStart = 29.3;
const mapCropWidth = 100 - mapCropStart;
const mapX = x => ((x - mapCropStart) / mapCropWidth) * 100;
const mapCropTop = 10.5;
const mapCropHeight = 100 - mapCropTop;
const mapY = y => ((y - mapCropTop) / mapCropHeight) * 100;


/* =========================================================
   LOCATION HELPERS
========================================================= */

function icon(location) {
  if (location.type === 'department') return 'D';
  if (location.type === 'lab') return 'L';
  if (location.type === 'room') return 'R';

  return '•';
}


function visibleLocations() {
  const q = query.trim().toLowerCase();

  return locations.filter(location => {

    const typeMatch =
      filter === 'all' ||
      location.type === filter;

    const searchableText =
      `${location.name}
       ${location.short}
       ${location.type}
      ${typeLabel(location.type)}`.toLowerCase();

    const searchMatch =
      !q ||
      searchableText.includes(q);

    return typeMatch && searchMatch;
  });
}


/* =========================================================
   RENDER DIRECTORY + MAP MARKERS
========================================================= */

function render() {

  const list = visibleLocations();

  const resultCount = $('#resultCount');
  const locationTotal = $('#locationTotal');

  if (resultCount) {
    resultCount.textContent =
      `${list.length} / ${locations.length}`;
  }

  if (locationTotal) {
    locationTotal.textContent =
      locations.length;
  }


  /* ---------------- DIRECTORY ---------------- */

  if (results) {

    if (list.length) {

      results.innerHTML = list.map(location => {

        const selectedClass =
          selected?.id === location.id
            ? 'selected'
            : '';

        return `
          <button
            class="result ${selectedClass}"
            data-id="${location.id}"
            data-type="${location.type}"
            type="button"
          >

            <span class="result-icon">
              ${icon(location)}
            </span>

            <span class="result-text">

              <b>${location.name}</b>

              <small>
                ${typeLabel(location.type)}
              </small>

            </span>

            <span class="result-arrow">
              ↗
            </span>

          </button>
        `;

      }).join('');

    } else {

      results.innerHTML = `
        <p class="empty">
          No matching location.
        </p>
      `;
    }


    results
      .querySelectorAll('.result')
      .forEach(button => {

        button.addEventListener('click', () => {

          select(
            button.dataset.id,
            true
          );

        });

      });
  }


  /* ---------------- MAP MARKERS ---------------- */

  if (markers) {

    markers.innerHTML = locations.map(location => {

      const isVisible =
        list.some(item =>
          item.id === location.id
        );

      const active =
        selected?.id === location.id
          ? 'active'
          : '';

      return `

        <div
          class="marker ${active}"
          data-id="${location.id}"
          style="
            left:${mapX(location.x)}%;
            top:${mapY(location.y)}%;
            display:${isVisible ? 'block' : 'none'};
          "
        >

          <button
            type="button"
            aria-label="${location.name}"
          >

            <span>
              ${location.short}
            </span>

          </button>

          <span class="marker-label">
            ${location.short}
          </span>

        </div>

      `;

    }).join('');


    markers
      .querySelectorAll('.marker button')
      .forEach(button => {

        button.addEventListener(
          'click',
          event => {

            event.stopPropagation();

            const marker =
              button.parentElement;

            select(
              marker.dataset.id,
              false
            );

          }
        );

      });

    bindQuizMarkers();
  }
}

function updateQuizText() {
  const score = $('#quizScore');
  const round = $('#quizRound');
  const streak = $('#quizStreak');
  const code = $('#quizTargetCode');

  if (score) score.textContent = quizScore;
  if (round) round.textContent = `ROUND ${String(Math.min(quizRound + 1, 8)).padStart(2, '0')} / 08`;
  if (streak) streak.textContent = quizAnswered ? 'ROUND COMPLETE' : quizActive ? 'TARGET ACTIVE' : 'READY TO PLAY';
  if (code) code.textContent = quizTarget?.short || '—';
}

function bindQuizMarkers() {
  if (!quizActive) return;

  markers?.querySelectorAll('.marker').forEach(marker => {
    marker.classList.toggle('quiz-target', marker.dataset.id === quizTarget?.id && !quizAnswered);
    marker.classList.toggle('quiz-dim', quizAnswered && marker.dataset.id !== quizTarget?.id);
    marker.querySelector('button')?.addEventListener('click', () => answerQuiz(marker.dataset.id), { once: true });
  });
}

function startQuiz() {
  quizActive = true;
  quizAnswered = false;
  quizRound = 0;
  quizScore = 0;
  quizPool = [...locations].sort(() => Math.random() - 0.5).slice(0, 8);
  nextQuizRound();
}

function nextQuizRound() {
  quizAnswered = false;
  quizTarget = quizPool[quizRound] || locations[Math.floor(Math.random() * locations.length)];

  const prompt = $('#quizPrompt');
  const hint = $('#quizHint');
  const feedback = $('#quizFeedback');
  const startButton = $('#quizStart');
  const nextButton = $('#quizNext');

  if (prompt) prompt.textContent = quizTarget.name;
  if (hint) hint.textContent = `${typeLabel(quizTarget.type)} · ${quizTarget.desc}`;
  if (feedback) {
    feedback.textContent = 'Tap the matching marker on the plan.';
    feedback.className = 'quiz-feedback';
  }
  if (startButton) startButton.textContent = 'Restart challenge ↗';
  if (nextButton) nextButton.disabled = true;

  updateQuizText();
  render();
  document.querySelector('#quiz')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function answerQuiz(id) {
  if (!quizActive || quizAnswered) return;

  quizAnswered = true;
  const correct = id === quizTarget.id;
  const feedback = $('#quizFeedback');
  const nextButton = $('#quizNext');

  if (correct) {
    quizScore += 100;
    if (feedback) feedback.textContent = `Correct. ${quizTarget.short} is exactly there.`;
  } else if (feedback) {
    feedback.textContent = `Not quite. The right place is ${quizTarget.short}.`;
    feedback.classList.add('wrong');
  }

  if (nextButton) nextButton.disabled = false;
  updateQuizText();
  render();

  const chosen = markers?.querySelector(`[data-id="${id}"]`);
  const target = markers?.querySelector(`[data-id="${quizTarget.id}"]`);
  chosen?.classList.add(correct ? 'quiz-correct' : 'quiz-wrong');
  target?.classList.add('quiz-correct');
}


/* =========================================================
   SELECT LOCATION
========================================================= */

function select(id, shouldFocus = false) {

  selected =
    locations.find(
      location => location.id === id
    );

  if (!selected) return;


  const placeType = $('#placeType');
  const placeName = $('#placeName');
  const placeDesc = $('#placeDesc');

  const placeCode = $('#placeCode');
  const placeCategory = $('#placeCategory');

  const mini = $('#selectionMini');
  const miniName = $('#selectionMiniName');


  if (placeType) {
    placeType.textContent =
      typeLabel(selected.type).toUpperCase();
  }

  if (placeName) {
    placeName.textContent =
      selected.name;
  }

  if (placeDesc) {
    placeDesc.textContent =
      selected.desc;
  }

  if (placeCode) {
    placeCode.textContent =
      selected.short;
  }

  if (placeCategory) {
    placeCategory.textContent =
      typeLabel(selected.type);
  }

  if (miniName) {
    miniName.textContent =
      selected.name;
  }

  if (mini) {
    mini.classList.add('show');
  }

  if (card) {
    card.classList.add('show');
  }


  render();

  let hasSavedRoute = false;
  try {
    const savedRoutes = JSON.parse(
      localStorage.getItem('iset-routes-by-location') || '{}'
    );
    hasSavedRoute = Array.isArray(savedRoutes[selected?.id]) &&
      savedRoutes[selected.id].length > 0;
  } catch {
    hasSavedRoute = false;
  }

  if (hasSavedRoute) {
    setRoute(true);
  } else if (route) {
    drawRoute();
  }

  if (shouldFocus) {
    focusMap();
  }
}


/* =========================================================
   MAP TRANSFORM
========================================================= */

function transform() {

  if (!canvas) return;

  clampPan();

  canvas.style.transform =
    `translate(
      calc(-50% + ${panX}px),
      calc(-50% + ${panY}px)
    )
    scale(${scale})`;
}


/* =========================================================
   FOCUS SELECTED LOCATION
========================================================= */

function clampPan() {
  if (!viewport || !canvas) return;

  const width = canvas.offsetWidth || 1;
  const height = canvas.offsetHeight || 1;
  const viewportWidth = viewport.clientWidth || width;
  const viewportHeight = viewport.clientHeight || height;

  // Keep the map usable: it can move freely while its edges stay reachable.
  const maxX = Math.max(0, (width * scale - viewportWidth) / 2 + 28);
  const maxY = Math.max(0, (height * scale - viewportHeight) / 2 + 28);

  panX = Math.max(-maxX, Math.min(maxX, panX));
  panY = Math.max(-maxY, Math.min(maxY, panY));
}

function focusMap() {
  if (!selected || !canvas) return;

  const width = canvas.offsetWidth || 1;
  const height = canvas.offsetHeight || 1;

  // Center the selected map coordinate accurately at the viewport center.
  panX = -((selected.x - 50) / 100) * width * scale;
  panY = -((selected.y - 50) / 100) * height * scale;
  clampPan();
  transform();
}


/* =========================================================
   RESET MAP VIEW
========================================================= */

function resetMap() {

  scale = 1;
  panX = 0;
  panY = 0;

  transform();
}


/* =========================================================
   ROUTE
========================================================= */

function buildRoutePath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  if (points.length === 2) {
    return `${d} L ${points[1].x} ${points[1].y}`;
  }

  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const penultimate = points[points.length - 2];
  const last = points[points.length - 1];
  d += ` Q ${penultimate.x} ${penultimate.y} ${last.x} ${last.y}`;
  return d;
}

function drawRoute() {
  if (!selected || !path) return;

  const glowPath = $('#routeGlowPath');
  const flowPath = $('#routeFlowPath');
  const waypointsLayer = $('#routeWaypoints');
  const destination = $('#routeDestination');
  const startLabel = $('#routeStartLabel');

  let routeSettings = { x: 66.7, y: 93 };
  let routesByLocation = {};
  let savedRoutePoints = [];

  try {
    routeSettings = {
      ...routeSettings,
      ...JSON.parse(localStorage.getItem('iset-route-settings') || '{}')
    };
    routesByLocation = JSON.parse(
      localStorage.getItem('iset-routes-by-location') || '{}'
    );

    const markerRoute = selected?.id
      ? routesByLocation[selected.id]
      : null;

    savedRoutePoints = Array.isArray(markerRoute)
      ? markerRoute
      : [];
  } catch (error) {
    console.warn('Saved route data could not be loaded.', error);
  }

  const startPoint = {
    x: mapX(Number(routeSettings.x)),
    y: mapY(Number(routeSettings.y))
  };

  const destinationPoint = {
    x: mapX(Number(selected.x)),
    y: mapY(Number(selected.y))
  };

  const hasSavedRouteForSelected =
    Array.isArray(routesByLocation[selected?.id]) &&
    routesByLocation[selected.id].length > 0;

  let routePoints = [];

  if (hasSavedRouteForSelected) {
    routePoints = [
      startPoint,
      ...savedRoutePoints
        .filter(point => Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)))
        .map(point => ({
          x: mapX(Number(point.x)),
          y: mapY(Number(point.y))
        })),
      destinationPoint
    ];
  } else {
    const middleY = Math.max(55, destinationPoint.y + 12);
    routePoints = [
      startPoint,
      { x: startPoint.x, y: middleY },
      { x: destinationPoint.x, y: middleY },
      destinationPoint
    ];
  }

  const d = buildRoutePath(routePoints);

  [path, glowPath, flowPath].forEach(routeLayer => {
    if (!routeLayer) return;
    routeLayer.setAttribute('d', d);
    routeLayer.classList.add('visible');
  });

  if (start) {
    start.setAttribute('cx', startPoint.x);
    start.setAttribute('cy', startPoint.y);
    start.classList.add('visible');
  }

  if (startLabel) {
    startLabel.setAttribute('x', startPoint.x);
    startLabel.setAttribute('y', Math.max(3, startPoint.y - 2.6));
    startLabel.classList.add('visible');
  }

  if (destination) {
    destination.setAttribute('cx', destinationPoint.x);
    destination.setAttribute('cy', destinationPoint.y - 1.1);
    destination.classList.add('visible');
  }

  if (waypointsLayer) {
    const visiblePoints = hasSavedRouteForSelected
      ? savedRoutePoints
      : [];

    waypointsLayer.innerHTML = visiblePoints
      .filter((point, index) => index === 0 || index === visiblePoints.length - 1 || index % 2 === 0)
      .map(point => {
        const x = mapX(Number(point.x));
        const y = mapY(Number(point.y));
        if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
        return `<circle class="visible" cx="${x}" cy="${y}" r=".42"></circle>`;
      })
      .join('');
  }
}


function setRoute(enabled) {

  route = enabled;

  const routeLayers = [
    path,
    $('#routeGlowPath'),
    $('#routeFlowPath'),
    start,
    $('#routeStartHalo'),
    $('#routeStartLabel'),
    $('#routeDestination')
  ];

  routeLayers.forEach(routeLayer => {
    routeLayer?.classList.toggle('visible', enabled);
  });

  $('#routeWaypoints')?.querySelectorAll('circle').forEach(point => {
    point.classList.toggle('visible', enabled);
  });


  if (routeStatus) {
    routeStatus.classList.toggle('show', enabled);
    if (routeStatusName) {
      routeStatusName.textContent = selected?.name || 'Destination';
    }
  }

  const routeButton =
    $('#routeBtn');

  if (routeButton) {

    routeButton.classList.toggle(
      'active',
      enabled
    );


    routeButton.innerHTML =
      enabled
        ? 'Hide route <b>×</b>'
        : 'Show route <b>↗</b>';
  }


  if (enabled) {
    drawRoute();
  }
}


/* =========================================================
   SEARCH
========================================================= */

if (search) {

  search.addEventListener(
    'input',
    event => {

      query =
        event.target.value;

      render();
    }
  );
}


/* =========================================================
   CATEGORY FILTERS
========================================================= */

$$('.chip').forEach(button => {

  button.addEventListener(
    'click',
    () => {

      filter =
        button.dataset.filter;


      $$('.chip').forEach(item => {

        item.classList.toggle(
          'active',
          item === button
        );

      });


      render();
    }
  );

});


/* =========================================================
   MAP TABS
========================================================= */

$$('.map-tabs button').forEach(button => {

  button.addEventListener(
    'click',
    () => {

      const view =
        button.dataset.view;


      let nextFilter = 'all';


      if (view === 'academic') {
        nextFilter = 'department';
      }

      if (view === 'services') {
        nextFilter = 'common';
      }


      filter = nextFilter;


      $$('.map-tabs button')
        .forEach(item => {

          item.classList.toggle(
            'active',
            item === button
          );

        });


      $$('.chip')
        .forEach(item => {

          item.classList.toggle(
            'active',
            item.dataset.filter === filter
          );

        });


      render();
    }
  );

});


/* =========================================================
   HERO BUTTON
========================================================= */

const goMap =
  $('#goMap');

if (goMap) {

  goMap.addEventListener(
    'click',
    () => {
      window.location.href = 'map.html';
    }
  );
}


/* =========================================================
   GUIDE / HELP
========================================================= */

const openGuide =
  $('#openGuide');

const openChallenge =
  $('#openChallenge');

const helpModal =
  $('#helpModal');

if (openGuide) {

  openGuide.addEventListener(
    'click',
    () => {

      helpModal?.classList.remove(
        'hidden'
      );

    }
  );
}

if (openChallenge) {
  openChallenge.addEventListener(
    'click',
    () => {
      window.location.href = 'quiz.html';
    }
  );
}


const helpButton =
  $('#helpBtn');

if (helpButton) {

  helpButton.addEventListener(
    'click',
    () => {

      helpModal?.classList.remove(
        'hidden'
      );

    }
  );
}


const closeHelp =
  $('#closeHelp');

if (closeHelp) {

  closeHelp.addEventListener(
    'click',
    () => {

      helpModal?.classList.add(
        'hidden'
      );

    }
  );
}


if (helpModal) {

  helpModal.addEventListener(
    'click',
    event => {

      if (
        event.target === helpModal
      ) {

        helpModal.classList.add(
          'hidden'
        );

      }

    }
  );
}


/* =========================================================
   ZOOM
========================================================= */

const zoomIn =
  $('#zoomIn');

if (zoomIn) {

  zoomIn.addEventListener(
    'click',
    () => {

      scale =
        Math.min(
          4.5,
          +(scale * 1.18).toFixed(2)
        );

      transform();
    }
  );
}


const zoomOut =
  $('#zoomOut');

if (zoomOut) {

  zoomOut.addEventListener(
    'click',
    () => {

      scale =
        Math.max(
          0.65,
          +(scale / 1.18).toFixed(2)
        );

      transform();
    }
  );
}


const resetView =
  $('#resetView');

if (resetView) {

  resetView.addEventListener(
    'click',
    resetMap
  );
}


/* =========================================================
   MINI FOCUS
========================================================= */

const miniFocus =
  $('#miniFocus');

if (miniFocus) {

  miniFocus.addEventListener(
    'click',
    () => {

      if (!selected) return;

      scale =
        Math.max(
          1.45,
          scale
        );

      focusMap();
    }
  );
}


/* =========================================================
   MAIN FOCUS BUTTON
========================================================= */

const focusButton =
  $('#focusBtn');

if (focusButton) {

  focusButton.addEventListener(
    'click',
    () => {

      if (!selected) return;

      scale =
        Math.max(
          1.45,
          scale
        );

      focusMap();
    }
  );
}


/* =========================================================
   ROUTE BUTTON
========================================================= */

const routeButton =
  $('#routeBtn');

if (routeButton) {

  routeButton.addEventListener(
    'click',
    () => {

      if (!selected) return;

      setRoute(!route);
    }
  );
}


/* =========================================================
   CLOSE LOCATION CARD
========================================================= */

const closeCard =
  $('#closeCard');

if (closeCard) {

  closeCard.addEventListener(
    'click',
    () => {

      card?.classList.remove(
        'show'
      );

      $('#selectionMini')
        ?.classList.remove(
          'show'
        );

      setRoute(false);
    }
  );
}


/* =========================================================
   RESET EVERYTHING
========================================================= */

const resetAll =
  $('#resetAll');

if (resetAll) {

  resetAll.addEventListener(
    'click',
    () => {

      query = '';
      filter = 'all';
      selected = null;
      route = false;

      if (search) {
        search.value = '';
      }


      $$('.chip').forEach(button => {

        button.classList.toggle(
          'active',
          button.dataset.filter === 'all'
        );

      });


      $$('.map-tabs button')
        .forEach(button => {

          button.classList.toggle(
            'active',
            button.dataset.view === 'all'
          );

        });


      card?.classList.remove(
        'show'
      );

      $('#selectionMini')
        ?.classList.remove(
          'show'
        );


      path?.classList.remove(
        'visible'
      );

      start?.classList.remove(
        'visible'
      );


      resetMap();
      render();
    }
  );
}

const quizStart = $('#quizStart');
const quizNext = $('#quizNext');

quizStart?.addEventListener('click', () => {
  window.location.href = 'quiz.html';
});
quizNext?.addEventListener('click', () => {
  if (!quizAnswered) return;
  quizRound += 1;
  if (quizRound >= 8) {
    quizRound = 0;
    quizPool = [...locations].sort(() => Math.random() - 0.5).slice(0, 8);
  }
  nextQuizRound();
});

updateQuizText();


/* =========================================================
   SMART MAP CONTROLS
   - Mouse wheel: smooth cursor-centered zoom
   - Mouse/touch drag: pan with safe bounds
   - Two fingers: pinch + move
   - Double click/tap: zoom in at that point
========================================================= */

const activePointers = new Map();
let pinchStartDistance = 0;
let pinchStartScale = 1;
let pinchStartMidpoint = null;
let lastTapTime = 0;
let lastTapPoint = null;

function distanceBetween(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function midpointBetween(a, b) {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  };
}

function zoomAroundPoint(nextScale, clientX, clientY) {
  if (!viewport) return;

  const rect = viewport.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const oldScale = scale;
  const clamped = Math.max(0.65, Math.min(4.5, nextScale));

  // Keep the exact map point under the cursor/fingers while zooming.
  const mapPointX = (localX - panX) / oldScale;
  const mapPointY = (localY - panY) / oldScale;

  scale = clamped;
  panX = localX - mapPointX * scale;
  panY = localY - mapPointY * scale;
  transform();
}

function zoomByFactor(factor, clientX, clientY) {
  zoomAroundPoint(scale * factor, clientX, clientY);
}

function mapPointFromEvent(event) {
  return { x: event.clientX, y: event.clientY };
}

if (viewport) {
  viewport.style.touchAction = 'none';

  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('button, a, input, textarea, select')) return;

    viewport.setPointerCapture?.(event.pointerId);
    activePointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY
    });

    if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()];
      pinchStartDistance = Math.max(1, distanceBetween(a, b));
      pinchStartScale = scale;
      pinchStartMidpoint = midpointBetween(a, b);
      drag = null;
      canvas?.classList.add('no-transition');
      return;
    }

    if (activePointers.size === 1) {
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX,
        panY,
        moved: false
      };
    }
  }, { passive: false });

  viewport.addEventListener('pointermove', event => {
    if (!activePointers.has(event.pointerId)) return;

    activePointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY
    });

    if (activePointers.size === 2) {
      event.preventDefault();
      const [a, b] = [...activePointers.values()];
      const distance = Math.max(1, distanceBetween(a, b));
      const midpoint = midpointBetween(a, b);
      const nextScale = pinchStartScale * (distance / pinchStartDistance);

      // Re-anchor each frame to the moving midpoint for a natural pinch.
      zoomAroundPoint(nextScale, pinchStartMidpoint.x, pinchStartMidpoint.y);
      panX += midpoint.x - pinchStartMidpoint.x;
      panY += midpoint.y - pinchStartMidpoint.y;
      pinchStartMidpoint = midpoint;
      transform();
      return;
    }

    if (activePointers.size === 1 && drag) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;

      if (drag.moved) {
        event.preventDefault();
        panX = drag.panX + dx;
        panY = drag.panY + dy;
        viewport.classList.add('dragging');
        canvas?.classList.add('no-transition');
        transform();
      }
    }
  }, { passive: false });

  const endPointer = event => {
    const wasDrag = drag?.moved;
    activePointers.delete(event.pointerId);
    viewport.classList.remove('dragging');
    canvas?.classList.remove('no-transition');

    if (activePointers.size < 2) {
      pinchStartDistance = 0;
      pinchStartMidpoint = null;
    }

    if (activePointers.size === 1) {
      const remaining = [...activePointers.values()][0];
      drag = {
        pointerId: [...activePointers.keys()][0],
        startX: remaining.clientX,
        startY: remaining.clientY,
        panX,
        panY,
        moved: false
      };
    } else {
      drag = null;
    }

    // Double-tap / double-click zoom, only on the map background.
    if (!wasDrag && activePointers.size === 0 &&
        !event.target.closest('.marker, .map-tools, .compass, .selection-mini')) {
      const now = performance.now();
      const point = mapPointFromEvent(event);
      const closeToPrevious = lastTapPoint &&
        Math.hypot(point.x - lastTapPoint.x, point.y - lastTapPoint.y) < 34;

      if (now - lastTapTime < 320 && closeToPrevious) {
        zoomByFactor(1.55, point.x, point.y);
        lastTapTime = 0;
        lastTapPoint = null;
      } else {
        lastTapTime = now;
        lastTapPoint = point;
      }
    }
  };

  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  // Smooth cursor-centered desktop zoom.
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    zoomByFactor(factor, event.clientX, event.clientY);
  }, { passive: false });
}

/* =========================================================
   FULLSCREEN
========================================================= */

const fullscreen =
  $('#fullscreen');

if (fullscreen) {

  fullscreen.addEventListener(
    'click',
    async () => {

      try {

        if (
          document.fullscreenElement
        ) {

          await document.exitFullscreen();

        } else {

          const mapWorkspace =
            $('.map-workspace');

          if (
            mapWorkspace &&
            mapWorkspace.requestFullscreen
          ) {

            await mapWorkspace.requestFullscreen();

          }

        }

      } catch (error) {

        console.warn(
          'Fullscreen unavailable:',
          error
        );

      }

    }
  );
}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
  'keydown',
  event => {

    /*
      Ctrl + K
      Open search
    */

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'k'
    ) {

      event.preventDefault();

      search?.focus();
    }


    /*
      Escape
    */

    if (
      event.key === 'Escape'
    ) {

      helpModal?.classList.add(
        'hidden'
      );

    }

  }
);


/* =========================================================
   INITIALIZE
========================================================= */

render();
transform();
loadSharedCampusData();
