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
  easy: { rounds: 6, time: 30, points: 100, clue: 'name', target: true, emoji: '😎' },
  normal: { rounds: 8, time: 20, points: 150, clue: 'name', target: false, emoji: '🔥' },
  hard: { rounds: 10, time: 12, points: 250, clue: 'type', target: false, emoji: '💀' }
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

// --- SOUND ENGINE - Web Audio bips ---
let audioCtx = null;
function getAudio(){
  if(!audioCtx) {
    try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; }
  }
  return audioCtx;
}
function playTone(freq, dur, type='sine', vol=0.15){
  const ctx = getAudio(); if(!ctx) return;
  if(ctx.state==='suspended') ctx.resume();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime+dur);
}
function playCorrect(){
  playTone(523,0.15,'sine',0.2);
  setTimeout(()=>playTone(659,0.15,'sine',0.2),80);
  setTimeout(()=>playTone(784,0.25,'sine',0.22),160);
}
function playWrong(){
  playTone(200,0.3,'sawtooth',0.12);
  setTimeout(()=>playTone(150,0.4,'sawtooth',0.1),100);
}
function playTick(){ playTone(800,0.05,'sine',0.06); }
function playHint(){ playTone(440,0.12,'triangle',0.12); setTimeout(()=>playTone(550,0.12,'triangle',0.12),80); }

// --- CONFETTI ---
function spawnConfetti(x,y, count=18){
  const colors = ['#b8ff54','#67e8f9','#ff8c78','#a78bfa','#ff7ac1','#5cff88'];
  for(let i=0;i<count;i++){
    const el = document.createElement('div');
    el.className='confetti';
    el.style.left = (x + (Math.random()-0.5)*60) + 'px';
    el.style.top = (y + (Math.random()-0.5)*20) + 'px';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.transform = `rotate(${Math.random()*360}deg)`;
    el.style.animationDelay = (Math.random()*0.15)+'s';
    el.style.animationDuration = (0.8+Math.random()*0.6)+'s';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1500);
  }
}
function spawnScreenConfetti(){
  const w = window.innerWidth, h = window.innerHeight;
  for(let i=0;i<32;i++){
    const el = document.createElement('div');
    el.className='confetti';
    el.style.left = (Math.random()*w) + 'px';
    el.style.top = (-20) + 'px';
    const colors = ['#b8ff54','#67e8f9','#ff8c78','#a78bfa'];
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.width = (6+Math.random()*8)+'px';
    el.style.height = (6+Math.random()*8)+'px';
    el.style.animationDuration = (1+Math.random()*1)+'s';
    el.style.animationDelay = (Math.random()*0.5)+'s';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 2200);
  }
}

function renderMarkers() {
  markers.innerHTML = locations.map((location,i) => `<div class="quiz-marker" data-id="${location.id}" style="left:${mapX(location.x)}%;top:${mapY(location.y)}%;animation-delay:${i*12}ms"><button type="button" aria-label="${location.name}"><span>${location.short}</span></button><em>${location.short}</em></div>`).join('');
  markers.querySelectorAll('.quiz-marker button').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    // Add tap ripple
    const rect = button.getBoundingClientRect();
    spawnConfetti(rect.left+rect.width/2, rect.top+rect.height/2, 6);
    answer(button.parentElement.dataset.id);
  }));
}

function updateLabels() {
  const totalRounds = modes[difficulty].rounds;
  const displayRound = Math.min(round + 1, totalRounds);
  const text = `ROUND ${String(displayRound).padStart(2,'0')} / ${String(totalRounds).padStart(2,'0')}`;
  scoreNode.textContent = score;
  progressNode.textContent = text + ` ${modes[difficulty].emoji}`;
  roundNode.textContent = text;
  targetCode.textContent = target?.short || '—';
  
  // Streak badge with fire
  if(streak >= 3){
    streakBadge.textContent = `🔥 STREAK ${streak} • x${1 + (streak-1)*0.25} COMBO!`;
    streakBadge.className = 'mega';
  } else if(streak >= 2){
    streakBadge.textContent = `🔥 STREAK ${streak} • ON FIRE!`;
    streakBadge.className = 'hot';
  } else {
    streakBadge.textContent = `STREAK ${streak}`;
    streakBadge.className = '';
  }
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
    if(secondsLeft <= 5 && secondsLeft > 0) playTick();
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
  // Fun start animation
  panel.animate([{transform:'scale(.96)', opacity:.8},{transform:'scale(1)', opacity:1}], {duration:400, easing:'cubic-bezier(.16,1,.3,1)'});
  nextRound();
}

function nextRound() {
  stopTimer();
  target = rounds[round];
  answered = false;
  hintUsed = false;
  hintCandidates = [];
  targetName.textContent = target.name;
  targetName.classList.remove('bump');
  void targetName.offsetWidth;
  targetName.classList.add('bump');
  targetDesc.textContent = modes[difficulty].clue === 'type'
    ? `${typeName(target.type)} · ${modes[difficulty].emoji} Find it using the campus layout — no name!`
    : `${typeName(target.type)} · Tap its marker on the ground-floor plan ${modes[difficulty].emoji}`;
  feedback.textContent = `🎯 Find ${target.short} — ${modes[difficulty].emoji} ${difficulty.toUpperCase()} MODE`;
  feedback.className = 'challenge-feedback';
  stateNode.textContent = 'TARGET ACTIVE • GO!';
  stateNode.className = '';
  startButton.textContent = 'Restart challenge ↗';
  nextButton.disabled = true;
  hintButton.disabled = false;
  panel.classList.remove('celebrate');
  updateLabels();
  renderMarkers();
  if (modes[difficulty].target) {
    setTimeout(()=>{
      document.querySelector('#challengeMarkers .quiz-marker[data-id="' + target.id + '"]')?.classList.add('target');
    }, 100);
  }
  startTimer();
  canvas.classList.toggle('fogged', difficulty === 'hard');
  canvas.classList.toggle('masked', difficulty !== 'easy');
  // Focus a bit on target area
  const tx = mapX(target.x), ty = mapY(target.y);
  panX = -(tx/100-0.5)* (canvas.offsetWidth||600) * 0.2;
  panY = -(ty/100-0.5)* (canvas.offsetHeight||400) * 0.2;
  transform();
}

function answer(id, timedOut = false) {
  if (!target || answered) return;
  stopTimer();
  answered = true;
  canvas.classList.remove('fogged');
  const correct = id === target.id && !timedOut;
  const chosen = id ? document.querySelector(`#challengeMarkers .quiz-marker[data-id="${id}"]`) : null;
  const answerTarget = document.querySelector(`#challengeMarkers .quiz-marker[data-id="${target.id}"]`);
  const rect = (chosen || answerTarget)?.getBoundingClientRect();

  if (correct) {
    streak += 1;
    const bonus = Math.max(0, streak - 1) * 25;
    const base = modes[difficulty].points;
    const hintPenalty = hintUsed ? 25 : 0;
    const timeBonus = Math.floor(secondsLeft * 2);
    const totalGain = base + bonus + timeBonus - hintPenalty;
    score += totalGain;

    // Pop score
    scoreNode.classList.add('pop');
    setTimeout(()=>scoreNode.classList.remove('pop'), 300);

    if(streak >= 3){
      feedback.textContent = `🔥 MEGA! +${totalGain}pts (base ${base} + streak ${bonus} + time ${timeBonus}${hintPenalty?` - hint ${hintPenalty}`:''}) • STREAK ${streak}!`;
      feedback.className = 'challenge-feedback mega';
      if(rect) spawnConfetti(rect.left+rect.width/2, rect.top, 24);
      spawnScreenConfetti();
    } else if(streak >= 2){
      feedback.textContent = `⚡ Correct! +${totalGain}pts • ${streak} streak! On fire!`;
      feedback.className = 'challenge-feedback correct';
      if(rect) spawnConfetti(rect.left+rect.width/2, rect.top, 16);
    } else {
      feedback.textContent = `✅ Correct! +${totalGain}pts${timeBonus?` (time bonus +${timeBonus})`:''} • Nice!`;
      feedback.className = 'challenge-feedback correct';
      if(rect) spawnConfetti(rect.left+rect.width/2, rect.top, 12);
    }

    chosen?.classList.add('correct');
    panel.classList.add('celebrate');
    stateNode.textContent = streak >=3 ? '🔥 MEGA CORRECT!' : '✅ CORRECT • GLOW!';
    stateNode.className = 'correct';
    playCorrect();

  } else {
    streak = 0;
    const wasTimeout = timedOut;
    feedback.textContent = wasTimeout ? `⏰ Time's up! The answer was ${target.short} — ${target.name}` : `❌ Nope! The correct place is ${target.short} — ${target.name}`;
    feedback.className = 'challenge-feedback wrong';
    chosen?.classList.add('wrong');
    // Shake screen
    document.body.classList.add('shake');
    viewport.classList.add('shake');
    setTimeout(()=>{ document.body.classList.remove('shake'); viewport.classList.remove('shake'); }, 400);
    stateNode.textContent = wasTimeout ? '⏰ TIME OUT' : '❌ TRY AGAIN';
    stateNode.className = 'wrong';
    playWrong();
  }

  answerTarget?.classList.add('correct');
  nextButton.disabled = false;
  hintButton.disabled = true;
  updateLabels();

  // Reveal all markers a bit
  document.querySelectorAll('.quiz-marker').forEach(m=>{
    if(m.dataset.id !== target.id) m.style.opacity = '0.5';
  });
}

startButton.addEventListener('click', start);
nextButton.addEventListener('click', () => {
  if (!answered) return;
  round += 1;
  if (round >= modes[difficulty].rounds) {
    stopTimer();
    const perfectScore = modes[difficulty].points * modes[difficulty].rounds;
    const pct = Math.round((score / (perfectScore + modes[difficulty].rounds*20)) * 100);
    targetName.textContent = `🏁 Final: ${score}pts • ${pct}%`;
    targetDesc.textContent = score >= perfectScore ? '🔥 Perfect campus memory! You are a legend!' : score >= perfectScore*0.7 ? '⚡ Great job! You know the campus well!' : '💪 Challenge complete. Try again to beat your score!';
    feedback.textContent = `🎉 You completed ${modes[difficulty].rounds} rounds in ${modes[difficulty].emoji} ${difficulty.toUpperCase()}! Streak max was ${streak}.`;
    feedback.className = 'challenge-feedback mega';
    stateNode.textContent = '🏁 COMPLETE • GG!';
    nextButton.disabled = true;
    target = null;
    updateLabels();
    renderMarkers();
    spawnScreenConfetti();
    spawnScreenConfetti();
    // Save best score
    const key = `iset-quiz-best-${difficulty}`;
    const best = parseInt(localStorage.getItem(key)||'0');
    if(score > best){
      localStorage.setItem(key, score);
      feedback.textContent += ` 🏆 NEW BEST for ${difficulty}!`;
      playCorrect(); setTimeout(playCorrect,200);
    }
    return;
  }
  nextRound();
});

document.querySelectorAll('.difficulty').forEach(button => button.addEventListener('click', () => {
  difficulty = button.dataset.level;
  document.querySelectorAll('.difficulty').forEach(item => item.classList.toggle('active', item === button));
  progressNode.textContent = `ROUND 01 / ${String(modes[difficulty].rounds).padStart(2,'0')} ${modes[difficulty].emoji}`;
  roundNode.textContent = `ROUND 01 / ${String(modes[difficulty].rounds).padStart(2,'0')}`;
  if(difficulty === 'easy'){
    feedback.textContent = '😎 Easy: target marker glows to help you. Relaxed, fun, learn the campus.';
  } else if(difficulty === 'normal'){
    feedback.textContent = '🔥 Normal: no glow, just clue + memory. Read, remember, tap fast for time bonus!';
  } else {
    feedback.textContent = '💀 Hard: fog + masked + 12s timer! Only real campus pros survive. Jaw 100%!';
  }
  feedback.className='challenge-feedback';
  playHint();
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
  feedback.textContent = '💡 Hint: 3 markers highlighted — one is correct! -25pts but better than fail!';
  playHint();
});

renderMarkers();
updateLabels();
timerNode.textContent = '--';
hintButton.disabled = true;

// Zoom & pan for quiz map - same smooth as full map
viewport.addEventListener('wheel', event => {
  event.preventDefault();
  const factor = Math.exp(-event.deltaY * 0.0012);
  scale = Math.max(.7, Math.min(3.2, +(scale * factor).toFixed(3)));
  transform();
}, {passive:false});

viewport.addEventListener('pointerdown', event => {
  if (event.target.closest('button')) return;
  drag = {x:event.clientX,y:event.clientY,px:panX,py:panY};
  viewport.setPointerCapture?.(event.pointerId);
  viewport.classList.add('dragging');
});
viewport.addEventListener('pointermove', event => {
  if (!drag) return;
  panX = drag.px + event.clientX - drag.x;
  panY = drag.py + event.clientY - drag.y;
  // Clamp a bit
  const max = 300;
  panX = Math.max(-max, Math.min(max, panX));
  panY = Math.max(-max, Math.min(max, panY));
  transform();
});
['pointerup','pointercancel'].forEach(type => viewport.addEventListener(type, () => { drag = null; viewport.classList.remove('dragging'); }));

// Keyboard shortcuts
document.addEventListener('keydown', e=>{
  if(e.target.matches('input,textarea,select')) return;
  if(e.key.toLowerCase()==='h' && !hintButton.disabled) hintButton.click();
  if(e.key===' ' || e.key==='Enter'){
    if(!nextButton.disabled) nextButton.click();
    else if(startButton) startButton.click();
  }
});
