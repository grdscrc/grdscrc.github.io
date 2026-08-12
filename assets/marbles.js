/* ── State ── */
let lastBag   = null;
let audioCtx  = null;
let busy      = false;
let speechReady = false;
let currentLanguage = 'fr';
let rollHistory = [];

/* Un sac par gamme de billes (4, 6, 8, 10, 12, 20, 100), rempli à la demande.
   Tant qu'un sac n'est pas vide, une bille déjà tirée ne peut pas ressortir :
   c'est ce qui "contrôle" le hasard (pas de répétition, pas de longue série)
   par rapport à un dé où chaque lancer est indépendant. */
let bags = {};

/* ── Pure marble-bag logic (no DOM/browser APIs — testable in isolation) ── */

/* ── Un sac neuf contient une bille numérotée par valeur possible ── */
function createFullBag(size) {
  return Array.from({ length: size }, (_, i) => i + 1);
}

/* ── Tire une bille au hasard dans le sac fourni (le remplit d'abord s'il est vide/absent).
   Retourne la valeur tirée et le sac restant (la bille tirée en est retirée). ── */
function drawMarble(bag, size, rand = Math.random) {
  const pool = (bag && bag.length > 0) ? bag : createFullBag(size);
  const idx  = Math.floor(rand() * pool.length);
  const value = pool[idx];
  const remaining = pool.slice(0, idx).concat(pool.slice(idx + 1));
  return { value, remaining };
}

function isCriticalFail(size, result) {
  return size >= 12 && result === 1;
}

function isCriticalSuccess(size, result) {
  return size >= 12 && result === size;
}

/* ── Ajoute une entrée en tête de l'historique, plafonné à maxItems ── */
const MAX_HISTORY = 20;
function pushHistoryEntry(history, entry, maxItems = MAX_HISTORY) {
  return [entry, ...history].slice(0, maxItems);
}

/* ── Décompose un nombre (0-100) en liste de fichiers audio FR à enchaîner ── */
function buildAudioFileList(number) {
  if (number <= 16)
    return [`./assets/audio/${number.toString().padStart(2, '0')}.mp3`];

  if (number % 10 === 0)
    return [`./assets/audio/${number}.mp3`];

  let tenths = Math.floor(number / 10);
  let units  = number % 10;
  if (number >= 17 && number <= 19)
    return [
      `./assets/audio/10.mp3`,
      `./assets/audio/${units.toString().padStart(2, '0')}.mp3`
    ];

  if (number >= 20 && number <= 69) {
    const files = [`./assets/audio/${tenths.toString().padEnd(2, '0')}.mp3`];
    if (units == 1) files.push(`./assets/audio/et.mp3`);
    if (units >= 1) files.push(`./assets/audio/${units.toString().padStart(2, '0')}.mp3`);
    return files;
  }

  if (number >= 71 && number <= 76) {
    const files = [`./assets/audio/60.mp3`];
    if (units === 1) files.push(`./assets/audio/et.mp3`); // "soixante ET onze"
    files.push(`./assets/audio/1${units}.mp3`);
    return files;
  }

  if (number >= 77 && number <= 79)
    return [`./assets/audio/70.mp3`, `./assets/audio/0${units.toString()}.mp3`];

  if (number >= 81 && number <= 96)
    return [
      `./assets/audio/80.mp3`,
      `./assets/audio/${(number - 80).toString().padStart(2, '0')}.mp3`
    ];

  if (number >= 97 && number <= 99)
    return [
      `./assets/audio/90.mp3`,
      `./assets/audio/0${(number - 90).toString()}.mp3`
    ];

  throw new Exception("Unhandled number");
}

/* ── Décompose un nombre (0-100) en liste de fichiers audio EN à enchaîner ── */
function buildAudioFileListEnglish(number) {
  if (number <= 20)
    return [`./assets/audio/english/${number.toString().padStart(2, '0')}.mp3`];
  if (number == 100)
    return [`./assets/audio/english/100.mp3`];

  const tens  = Math.floor(number / 10) * 10;
  const units = number % 10;
  const files = [];
  files.push(`./assets/audio/english/${tens}.mp3`);
  if (units >= 1) files.push(`./assets/audio/english/${units.toString().padStart(2, '0')}.mp3`);
  return files;
}

const GAP_BETWEEN_WORDS    = 0.02;  // silence entre deux mots/phrases distincts
const GAP_WITHIN_A_NUMBER  = 0; // silence entre les syllabes d'un même nombre composé (ex: quatre-vingt-dix-neuf)

const LANGUAGES = {
  fr: {
    resultat: './assets/audio/resultat.mp3',
    buildNumber: buildAudioFileList,
    flagLabel: '🇫🇷 Français',
    title:  '🔮 Billes Audio',
    hint:   'Appuie sur un sac — une bille en est tirée, le résultat est annoncé à voix haute',
    reroll: '↺ Tirer une autre bille du même sac',
    resetLabel: '🔄 Réinitialiser les sacs',
    speechLang: 'fr-FR',
    announce: (size, result) => `Tirage dans le sac de 1 à ${size}, résultat : ${result}`,
    critFailSuffix:    ' : échec critique !',
    critSuccessSuffix: ' : succès critique !',
    critFailAudio:    './assets/audio/echec_critique.mp3',
    critSuccessAudio: './assets/audio/succes_critique.mp3',
    historyTitle: 'Historique',
    historyEmpty: 'Aucun tirage pour l\'instant',
    remainingLabel: (n, size) => `${n} / ${size} billes restantes dans le sac`,
  },
  en: {
    resultat: './assets/audio/english/result.mp3',
    buildNumber: buildAudioFileListEnglish,
    flagLabel: '🇬🇧 English',
    title:  '🔮 Audio Marbles',
    hint:   'Tap a bag — a marble is drawn from it, the result is announced out loud',
    reroll: '↺ Draw another marble from the same bag',
    resetLabel: '🔄 Reset the bags',
    speechLang: 'en-US',
    announce: (size, result) => `Drawing from the 1 to ${size} bag, result: ${result}`,
    critFailSuffix:    ' : critical failure!',
    critSuccessSuffix: ' : critical success!',
    critFailAudio:    './assets/audio/english/critical_fail.mp3',
    critSuccessAudio: './assets/audio/english/critical_success.mp3',
    historyTitle: 'History',
    historyEmpty: 'No draws yet',
    remainingLabel: (n, size) => `${n} / ${size} marbles left in the bag`,
  },
};

/* ── Ajoute à `segments` les fichiers d'un nombre, avec un silence court entre ses syllabes
   et le silence normal après le dernier (avant le mot/segment suivant) ── */
function pushNumberSegments(segments, number, buildNumber) {
  const files = buildNumber(number);
  files.forEach((file, i) => {
    const isLast = i === files.length - 1;
    segments.push({ file, gap: isLast ? GAP_BETWEEN_WORDS : GAP_WITHIN_A_NUMBER });
  });
}

/* ── Construit l'annonce complète : "Résultat : {result}" (ou son équivalent EN) ──
   Contrairement aux dés, on ne dispose pas d'enregistrements pour "sac"/"bille" :
   seul le mot "résultat" + le nombre tiré sont donc joués depuis les clips audio
   (la synthèse vocale de secours, elle, prononce la phrase complète — voir `announce`). ──
   Chaque segment porte le silence à respecter après sa lecture. ── */
function buildDrawAnnouncementSegments(result, lang = 'fr') {
  const t = LANGUAGES[lang];
  const segments = [];
  segments.push({ file: t.resultat, gap: GAP_BETWEEN_WORDS });
  pushNumberSegments(segments, result, t.buildNumber);
  return segments;
}

/* ── Unlock iOS speech synthesis (must run in synchronous user gesture) ── */
function ensureSpeech() {
  if (speechReady || typeof speechSynthesis === 'undefined') return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  speechSynthesis.speak(u);
  speechReady = true;
}

/* ── Audio context (lazy, requires user gesture) ── */
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ── Joue un unique clip audio (ex: annonce d'échec/succès critique enregistrée) ── */
function playClip(path, onDone) {
  ctx();
  fetch(path)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    })
    .then(arr => audioCtx.decodeAudioData(arr))
    .then(buffer => {
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
      if (onDone) setTimeout(onDone, buffer.duration * 1000);
    })
    .catch(err => {
      console.error('Error playing clip:', err);
      if (onDone) onDone();
    });
}

/* ── TTS ──
   `onDone` est appelé exactement quand l'annonce finit de jouer (pas une estimation),
   pour pouvoir enchaîner un jingle critique sans qu'il chevauche la voix. ── */
function speak(size, result, critFail, critSuccess, lang, onDone) {
  ctx(); // s'assure que audioCtx existe avant le décodage

  const segments = buildDrawAnnouncementSegments(result, lang);
  const fetches  = segments.map(seg => fetch(seg.file));

  Promise.all(fetches).then(async responses => {
    // 1. Décoder tous les buffers
    const buffers = await Promise.all(
      responses.map(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const arr = await r.arrayBuffer();
        return audioCtx.decodeAudioData(arr);
      })
    );

    // 2. Les programmer en séquence, avec le silence propre à chaque segment
    const startTime = audioCtx.currentTime;
    let t = startTime;
    buffers.forEach((buffer, i) => {
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(t);
      t += buffer.duration + segments[i].gap;
    });

    if (onDone) setTimeout(onDone, (t - startTime) * 1000);
  }).catch(err => {
    console.error('Error fetching or playing audio:', err);
    speech(size, result, critFail, critSuccess, lang, onDone);
  });
}

function speech(size, result, critFail, critSuccess, lang, onDone) {
  const t = LANGUAGES[lang];
  let text = t.announce(size, result);
  if (critFail) text += t.critFailSuffix;
  if (critSuccess) text += t.critSuccessSuffix;
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = t.speechLang;
  utt.rate   = 0.88;
  utt.pitch  = 1.05;

  // Pick best voice for the current language if available
  const prefix = t.speechLang.split('-')[0];
  const voices = speechSynthesis.getVoices();
  const best   = voices.find(v => v.lang === t.speechLang && v.localService)
              || voices.find(v => v.lang.startsWith(prefix + '-'))
              || voices.find(v => v.lang.startsWith(prefix));
  if (best) utt.voice = best;

  if (onDone) {
    utt.onend   = onDone;
    utt.onerror = onDone;
  }

  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
}

/* ── Affiche l'historique des tirages ── */
function renderHistory() {
  const list = document.getElementById('historyList');
  const t = LANGUAGES[currentLanguage];

  if (rollHistory.length === 0) {
    list.innerHTML = `<li class="list-group-item bg-transparent text-body-secondary text-center small">${t.historyEmpty}</li>`;
    return;
  }

  list.innerHTML = rollHistory.map(({ size, result, isCritFail, isCritSuccess, remaining }) => {
    const resultClass = isCritFail ? 'text-danger fw-bold' : isCritSuccess ? 'text-warning fw-bold' : 'fw-semibold';
    return `<li class="list-group-item bg-transparent d-flex justify-content-between align-items-center">
      <span class="text-body-secondary">1–${size} <small class="text-body-tertiary">(${remaining}/${size})</small></span>
      <span class="${resultClass}">${result}</span>
    </li>`;
  }).join('');
}

/* ── Scramble animation ── */
function scramble(finalVal, size, done) {
  const el     = document.getElementById('resultValue');
  const frames = 14;
  let   count  = 0;
  el.classList.add('rolling');

  const id = setInterval(() => {
    el.textContent = Math.floor(Math.random() * size) + 1;
    if (++count >= frames) {
      clearInterval(id);
      el.classList.remove('rolling');
      el.textContent = finalVal;
      done && done();
    }
  }, 55);
}

/* ── Met à jour le badge "billes restantes" affiché sur un bouton de sac ── */
function updateBagBadge(size) {
  const el = document.getElementById(`remain${size}`);
  if (!el) return;
  const remaining = bags[size] ? bags[size].length : size;
  el.textContent = `${remaining}/${size}`;
}

function updateAllBagBadges() {
  [4, 6, 8, 10, 12, 20, 100].forEach(updateBagBadge);
}

/* ── Main draw ── */
function draw(size) {
  if (busy) return;
  ensureSpeech(); // doit être appelé ici, synchrone, dans le geste utilisateur
  busy    = true;
  lastBag = size;

  const { value: result, remaining } = drawMarble(bags[size], size);
  bags[size] = remaining;
  updateBagBadge(size);

  // Reset UI
  const panel = document.getElementById('panel');
  const valEl = document.getElementById('resultValue');
  panel.classList.remove('critical-fail', 'critical-success');
  panel.classList.add('active');
  valEl.classList.remove('critical-fail', 'critical-success', 'rolling');
  document.getElementById('resultLabel').textContent = `1–${size}`;
  valEl.textContent = '…';
  document.getElementById('rerollBtn').classList.remove('visible');
  document.querySelectorAll(".die-btn").forEach(d => d.classList.remove('current'))
  document.getElementById(`bag${size}`).classList.add('current');

  const t = LANGUAGES[currentLanguage];
  document.getElementById('remainingLabel').textContent = t.remainingLabel(remaining.length, size);

  const isCritFail    = isCriticalFail(size, result);
  const isCritSuccess = isCriticalSuccess(size, result);

  // busy ne repasse à false qu'une fois l'animation ET tout l'audio (annonce +
  // clip critique éventuel) terminés, pour empêcher un nouveau clic de faire
  // chevaucher deux voix.
  let scrambleDone = false;
  let audioDone    = false;
  const maybeFinish = () => {
    if (!scrambleDone || !audioDone) return;
    document.getElementById('rerollBtn').classList.add('visible');
    busy = false;
  };

  // Annonce vocale lancée dès le clic, en parallèle de l'animation.
  // Le clip critique n'est joué qu'une fois l'annonce réellement terminée (onDone).
  speak(size, result, isCritFail, isCritSuccess, currentLanguage, () => {
    const critClip = isCritFail ? t.critFailAudio : isCritSuccess ? t.critSuccessAudio : null;
    if (critClip) {
      playClip(critClip, () => { audioDone = true; maybeFinish(); });
    } else {
      audioDone = true;
      maybeFinish();
    }
  });

  scramble(result, size, () => {
    // Apply critical visual state
    if (isCritFail) {
      panel.classList.add('critical-fail');
      valEl.classList.add('critical-fail');
    } else if (isCritSuccess) {
      panel.classList.add('critical-success');
      valEl.classList.add('critical-success');
    }

    rollHistory = pushHistoryEntry(rollHistory, { size, result, isCritFail, isCritSuccess, remaining: remaining.length });
    renderHistory();

    scrambleDone = true;
    maybeFinish();
  });
}

function reroll() {
  if (lastBag) draw(lastBag);
}

/* ── Remet tous les sacs à neuf (pleins, non mélangés au préalable) : c'est le
   levier de "contrôle" du hasard laissé à l'utilisateur — il peut forcer un
   sac neuf plutôt que d'attendre qu'il se vide naturellement. ── */
function resetBags() {
  bags = {};
  updateAllBagBadges();
  document.getElementById('remainingLabel').textContent = ' ';
}

/* ── Sélecteur de langue FR ⇄ EN ── */
function applyLanguage() {
  const t = LANGUAGES[currentLanguage];
  document.getElementById('appTitle').textContent = t.title;
  document.getElementById('hintText').textContent = t.hint;
  document.getElementById('rerollBtn').textContent = t.reroll;
  document.getElementById('resetBtn').textContent = t.resetLabel;
  document.getElementById('langDropdownLabel').textContent = t.flagLabel;
  document.getElementById('historyTitle').textContent = t.historyTitle;
  document.documentElement.lang = currentLanguage;
  renderHistory();
}

function closeLangMenu() {
  document.getElementById('langDropdownMenu').classList.remove('show');
  document.getElementById('langDropdownBtn').setAttribute('aria-expanded', 'false');
}

function toggleLangMenu(event) {
  event.stopPropagation();
  const isOpen = document.getElementById('langDropdownMenu').classList.toggle('show');
  document.getElementById('langDropdownBtn').setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function setLanguage(lang) {
  currentLanguage = lang;
  applyLanguage();
  closeLangMenu();
  history.replaceState(null, '', '#' + lang);
}

/* ── Langue initiale : lit le hash de l'URL (ex: #en), sinon garde le français par défaut ── */
function languageFromHash() {
  const hash = window.location.hash.slice(1).toLowerCase();
  return LANGUAGES[hash] ? hash : null;
}

/* ── Pre-load voices (browsers load async) ── */
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

if (typeof document !== 'undefined') {
  currentLanguage = languageFromHash() || currentLanguage;
  applyLanguage();
  updateAllBagBadges();
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-dropdown')) closeLangMenu();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createFullBag, drawMarble, isCriticalFail, isCriticalSuccess, pushHistoryEntry,
    buildAudioFileList, buildAudioFileListEnglish,
    buildDrawAnnouncementSegments,
  };
}
