const locations = [
  ['dti','Département Technologies de l’Informatique','DTI','department',82,88.8],['seg','Département Sciences Économiques et Gestion','SEG','department',54.2,89],['gm','Département Génie Mécanique','GM','department',79,29.8],['ge','Département Génie Électrique','GE','department',48.8,36.2],
  ['library','Bibliothèque','BIB','common',49.5,44.2],['amphi','Amphithéâtre & buvette','AMP','common',40.3,61.5],['admin','Administration','ADM','common',77.7,61.6],['custom-1790180404979','Clubs','CLB','common',67.6,81.5],
  ['machine','Hall Machine','HM','lab',63.6,32.5],['cao','Lab CAO','CAO','lab',74.8,36.1],['ge2','Lab GE2','GE2','lab',78.9,36.2],['cnd','Lab CND','CND','lab',81.2,41.1],['systeme','Lab Système','SYS','lab',75,45.8],['langue','Labo de langue','LANG','lab',46.6,51],['lab2','Lab 2 AII','AII','lab',76.2,72.9],['lab3','Lab 3 DPI','DPI','lab',81.3,72.9],['lab1','Lab 1 SEI','SEI','lab',75.7,82.2],['lab4','Lab 4 CFI','CFI','lab',81,82.1],
  ...['104','103','102','101'].map((n,i)=>['s'+n,'Salle '+n,n,'room',[58.6,62.2,66,69][i],44.1]),
  ...['105','106','107','108'].map((n,i)=>['s'+n,'Salle '+n,n,'room',53,[51,54.3,63.4,67.2][i]]),
  ...['116','115'].map((n,i)=>['s'+n,'Salle '+n,n,'room',[48.8,53.4][i],74.3]),
  ...['109','110','111','112'].map((n,i)=>['s'+n,'Salle '+n,n,'room',[58.6,62.2,66,69.5][i],74.3]),
  ['eep','EEP','EEP','room',51,82]
].map(([id,name,short,type,x,y])=>({id,name,short,type,x,y}));

try {
  const savedLocations = JSON.parse(localStorage.getItem('iset-locations') || 'null');
  if (Array.isArray(savedLocations) && savedLocations.length) {
    locations.splice(0, locations.length, ...savedLocations);
  }
} catch (error) {
  console.warn('Saved locations could not be loaded.', error);
}

const canvas = document.querySelector('#challengeCanvas');
const markers = document.querySelector('#challengeMarkers');
const scoreNode = document.querySelector('#score');
const progressNode = document.querySelector('#progress');
const roundNode = document.querySelector('#roundLabel');
const stateNode = document.querySelector('#stateLabel');
const targetName = document.querySelector('#targetName');
const targetDesc = document.querySelector('#targetDesc');
const targetCode = document.querySelector('#targetCode');
const feedback = document.querySelector('#feedback');
const startButton = document.querySelector('#startButton');
const nextButton = document.querySelector('#nextButton');
const hintButton = document.querySelector('#hintButton');
const timerNode = document.querySelector('#timer');
const timerBar = document.querySelector('#timerBar');
const timerBox = document.querySelector('.challenge-timer');
const streakBadge = document.querySelector('#streakBadge');
const panel = document.querySelector('.challenge-panel');
const viewport = document.querySelector('#challengeViewport');

let rounds = [];
let round = 0;
let score = 0;
let target = null;
let answered = false;
let scale = 1;
let panX = 0;
let panY = 0;
let drag = null;
let difficulty = 'easy';
let streak = 0;
let hintUsed = false;
let secondsLeft = 0;
let timerId = null;
let hintCandidates = [];
const modes = {
  easy: { rounds: 6, time: 30, points: 100, clue: 'name', target: true },
  normal: { rounds: 8, time: 20, points: 150, clue: 'name', target: false },
  hard: { rounds: 10, time: 12, points: 250, clue: 'type', target: false }
};
const mapCropStart = 29.3;
const mapCropWidth = 100 - mapCropStart;
const mapX = x => ((x - mapCropStart) / mapCropWidth) * 100;
const mapCropTop = 10.5;
const mapCropHeight = 100 - mapCropTop;
const mapY = y => ((y - mapCropTop) / mapCropHeight) * 100;

function typeName(type) { return window.siteTypeLabels?.[type] || {department:'Department',lab:'Laboratory',room:'Teaching room',common:'Campus service'}[type]; }
function transform() { canvas.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`; }
function shuffle(list) { return [...list].sort(() => Math.random() - 0.5); }

function renderMarkers() {
  markers.innerHTML = locations.map(location => `<div class="quiz-marker" data-id="${location.id}" style="left:${mapX(location.x)}%;top:${mapY(location.y)}%"><button type="button" aria-label="${location.name}"><span>${location.short}</span></button><em>${location.short}</em></div>`).join('');
  markers.querySelectorAll('.quiz-marker button').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    answer(button.parentElement.dataset.id);
  }));
}

function updateLabels() {
  const totalRounds = modes[difficulty].rounds;
  const displayRound = Math.min(round + 1, totalRounds);
  const text = `ROUND ${String(displayRound).padStart(2,'0')} / ${String(totalRounds).padStart(2,'0')}`;
  scoreNode.textContent = score;
  progressNode.textContent = text;
  roundNode.textContent = text;
  targetCode.textContent = target?.short || '—';
  streakBadge.textContent = `STREAK ${streak}`;
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function startTimer() {
  stopTimer();
  secondsLeft = modes[difficulty].time;
  const total = secondsLeft;
  const tick = () => {
    timerNode.textContent = `${secondsLeft}s`;
    timerBar.style.width = `${Math.max(0, (secondsLeft / total) * 100)}%`;
    timerBox.classList.toggle('warning', secondsLeft <= 5);
    if (secondsLeft <= 0) {
      stopTimer();
      answer(null, true);
      return;
    }
    secondsLeft -= 1;
  };
  tick();
  timerId = setInterval(tick, 1000);
}

function pickHintCandidates() {
  const alternatives = shuffle(locations.filter(location => location.id !== target.id)).slice(0, 2);
  hintCandidates = shuffle([target, ...alternatives]).map(location => location.id);
}

function start() {
  rounds = shuffle(locations).slice(0, modes[difficulty].rounds);
  round = 0;
  score = 0;
  streak = 0;
  scale = 1;
  panX = 0;
  panY = 0;
  transform();
  nextRound();
}

function nextRound() {
  stopTimer();
  target = rounds[round];
  answered = false;
  hintUsed = false;
  hintCandidates = [];
  targetName.textContent = target.name;
  targetDesc.textContent = modes[difficulty].clue === 'type'
    ? `${typeName(target.type)} · Find it using the campus layout.`
    : `${typeName(target.type)} · Tap its marker on the ground-floor plan.`;
  feedback.textContent = 'Find the matching marker on the plan.';
  feedback.className = 'challenge-feedback';
  stateNode.textContent = 'TARGET ACTIVE';
  startButton.textContent = 'Restart challenge ↗';
  nextButton.disabled = true;
  hintButton.disabled = false;
  panel.classList.remove('celebrate');
  updateLabels();
  renderMarkers();
  if (modes[difficulty].target) {
    document.querySelector('#challengeMarkers .quiz-marker[data-id="' + target.id + '"]')?.classList.add('target');
  }
  startTimer();
  canvas.classList.toggle('fogged', difficulty === 'hard');
  canvas.classList.toggle('masked', difficulty !== 'easy');
}

function answer(id, timedOut = false) {
  if (!target || answered) return;
  stopTimer();
  answered = true;
  canvas.classList.remove('fogged');
  const correct = id === target.id && !timedOut;
  const chosen = id ? document.querySelector(`#challengeMarkers .quiz-marker[data-id="${id}"]`) : null;
  const answerTarget = document.querySelector(`#challengeMarkers .quiz-marker[data-id="${target.id}"]`);
  if (correct) {
    streak += 1;
    const bonus = Math.max(0, streak - 1) * 25;
    score += modes[difficulty].points + bonus - (hintUsed ? 25 : 0);
    feedback.textContent = `Correct. +${modes[difficulty].points + bonus - (hintUsed ? 25 : 0)} points${streak > 1 ? ` · ${streak} streak` : ''}.`;
    chosen?.classList.add('correct');
    panel.classList.add('celebrate');
  } else {
    streak = 0;
    feedback.textContent = timedOut ? `Time's up. The answer was ${target.short}.` : `Not quite. The correct place is ${target.short}.`;
    feedback.classList.add('wrong');
    chosen?.classList.add('wrong');
  }
  answerTarget.classList.add('correct');
  stateNode.textContent = correct ? 'CORRECT' : 'TRY AGAIN';
  nextButton.disabled = false;
  hintButton.disabled = true;
  updateLabels();
}

startButton.addEventListener('click', start);
nextButton.addEventListener('click', () => {
  if (!answered) return;
  round += 1;
  if (round >= modes[difficulty].rounds) {
    targetName.textContent = `Final score: ${score}`;
    const perfectScore = modes[difficulty].points * modes[difficulty].rounds;
    targetDesc.textContent = score >= perfectScore ? 'Perfect campus memory.' : 'Challenge complete. Start again to beat your score.';
    feedback.textContent = `You completed all ${modes[difficulty].rounds} rounds.`;
    stateNode.textContent = 'COMPLETE';
    nextButton.disabled = true;
    target = null;
    updateLabels();
    renderMarkers();
    return;
  }
  nextRound();
});

document.querySelectorAll('.difficulty').forEach(button => button.addEventListener('click', () => {
  difficulty = button.dataset.level;
  document.querySelectorAll('.difficulty').forEach(item => item.classList.toggle('active', item === button));
  progressNode.textContent = `ROUND 01 / ${String(modes[difficulty].rounds).padStart(2, '0')}`;
  roundNode.textContent = progressNode.textContent;
  feedback.textContent = difficulty === 'easy' ? 'Relaxed mode: the target marker helps you.' : difficulty === 'normal' ? 'Normal mode: read the clue and trust your memory.' : 'Hard mode: no target highlight. Beat the clock.';
}));

hintButton.addEventListener('click', () => {
  if (!target || answered || hintUsed) return;
  hintUsed = true;
  hintButton.disabled = true;
  pickHintCandidates();
  document.querySelectorAll('.quiz-marker').forEach(marker => {
    marker.classList.toggle('candidate', hintCandidates.includes(marker.dataset.id));
    marker.classList.toggle('quiz-dim', !hintCandidates.includes(marker.dataset.id));
  });
  const marker = document.querySelector(`#challengeMarkers .quiz-marker[data-id="${target.id}"]`);
  marker?.classList.add('hint');
  feedback.textContent = 'Hint activated. Choose one of the three highlighted markers.';
});

renderMarkers();
updateLabels();
timerNode.textContent = '--';
hintButton.disabled = true;

viewport.addEventListener('wheel', event => {
  event.preventDefault();
  scale = Math.max(.7, Math.min(2.8, +(scale + (event.deltaY < 0 ? .1 : -.1)).toFixed(2)));
  transform();
}, {passive:false});
viewport.addEventListener('pointerdown', event => {
  if (event.target.closest('button')) return;
  drag = {x:event.clientX,y:event.clientY,px:panX,py:panY};
  viewport.setPointerCapture?.(event.pointerId);
});
viewport.addEventListener('pointermove', event => {
  if (!drag) return;
  panX = drag.px + event.clientX - drag.x;
  panY = drag.py + event.clientY - drag.y;
  transform();
});
['pointerup','pointercancel'].forEach(type => viewport.addEventListener(type, () => { drag = null; }));
