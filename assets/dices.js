/* ── State ── */
let lastDie   = null;
let audioCtx  = null;
let busy      = false;
let speechReady = false;
let currentLanguage = 'fr';
let rollHistory = [];

const MAX_HISTORY = 20;

/* ── Pure dice logic (no DOM/browser APIs — testable in isolation) ── */
function rollDie(faces, rand = Math.random) {
  return Math.floor(rand() * faces) + 1;
}

function isCriticalFail(faces, result) {
  return faces >= 12 && result === 1;
}

function isCriticalSuccess(faces, result) {
  return faces >= 12 && result === faces;
}

/* ── Ajoute une entrée en tête de l'historique, plafonné à maxItems ── */
function pushHistoryEntry(history, entry, maxItems = MAX_HISTORY) {
  return [entry, ...history].slice(0, maxItems);
}

/* ── Décompose un nombre (0-100) en liste de fichiers audio FR à enchaîner ── */
function buildAudioFileList(number) {
  const files = [];
  if (number <= 16) {
    files.push(`./assets/audio/${number.toString().padStart(2, '0')}.mp3`);
  } else if (number == 100) {
    files.push(`./assets/audio/100.mp3`);
  } else {
    let tenths = Math.floor(number / 10);
    let units  = number % 10;
    if (number >= 17 && number <= 19) {
      files.push(`./assets/audio/10.mp3`);
      files.push(`./assets/audio/${units.toString().padStart(2, '0')}.mp3`);
    } else if (number >= 20 && number <= 69) {
      files.push(`./assets/audio/${tenths.toString().padEnd(2, '0')}.mp3`);
      if (units == 1) files.push(`./assets/audio/et.mp3`);
      if (units >= 1) files.push(`./assets/audio/${units.toString().padStart(2, '0')}.mp3`);
    } else if (number >= 70 && number <= 79) {
      files.push(`./assets/audio/60.mp3`);
      if (units === 0) {
        files.push(`./assets/audio/10.mp3`);
      } else if (units <= 6) {
        files.push(`./assets/audio/1${units}.mp3`);
      } else {
        files.push(`./assets/audio/10.mp3`);
        files.push(`./assets/audio/0${units.toString()}.mp3`);
      }
    } else if (number >= 80 && number <= 99) {
      units = number - 80;
      files.push(`./assets/audio/04.mp3`);
      files.push(`./assets/audio/20.mp3`);
      if (units >= 1 && units <= 16)
        files.push(`./assets/audio/${units.toString().padStart(2, '0')}.mp3`);
      else if (units >= 17) {
        files.push(`./assets/audio/10.mp3`);
        files.push(`./assets/audio/0${(units - 10).toString()}.mp3`);
      }
    }
  }
  return files;
}

/* ── Décompose un nombre (0-100) en liste de fichiers audio EN à enchaîner ── */
function buildAudioFileListEnglish(number) {
  const files = [];
  if (number <= 20) {
    files.push(`./assets/audio/english/${number.toString().padStart(2, '0')}.mp3`);
  } else if (number == 100) {
    files.push(`./assets/audio/english/100.mp3`);
  } else {
    const tens  = Math.floor(number / 10) * 10;
    const units = number % 10;
    files.push(`./assets/audio/english/${tens}.mp3`);
    if (units >= 1) files.push(`./assets/audio/english/${units.toString().padStart(2, '0')}.mp3`);
  }
  return files;
}

const GAP_BETWEEN_WORDS    = 0.02;  // silence entre deux mots/phrases distincts
const GAP_WITHIN_A_NUMBER  = 0; // silence entre les syllabes d'un même nombre composé (ex: quatre-vingt-dix-neuf)

const LANGUAGES = {
  fr: {
    lancer:   './assets/audio/lancer.mp3',
    d:        './assets/audio/d.mp3',
    resultat: './assets/audio/resultat.mp3',
    buildNumber: buildAudioFileList,
    flagLabel: '🇫🇷 Français',
    title:  '🎲 Dés Audio',
    hint:   'Appuie sur un dé — le résultat est annoncé à voix haute',
    reroll: '↺ Relancer le même dé',
    speechLang: 'fr-FR',
    announce: (faces, result) => `Lancer d${faces}, résultat : ${result}`,
    critFailSuffix:    ' : échec critique !',
    critSuccessSuffix: ' : succès critique !',
    critFailAudio:    './assets/audio/echec_critique.mp3',
    critSuccessAudio: './assets/audio/succes_critique.mp3',
    historyTitle: 'Historique',
    historyEmpty: 'Aucun lancer pour l\'instant',
  },
  en: {
    lancer:   './assets/audio/english/throwing.mp3',
    d:        './assets/audio/english/d.mp3',
    resultat: './assets/audio/english/result.mp3',
    buildNumber: buildAudioFileListEnglish,
    flagLabel: '🇬🇧 English',
    title:  '🎲 Audio Dice',
    hint:   'Tap a die — the result is announced out loud',
    reroll: '↺ Reroll the same die',
    speechLang: 'en-US',
    announce: (faces, result) => `Throwing d${faces}, result: ${result}`,
    critFailSuffix:    ' : critical failure!',
    critSuccessSuffix: ' : critical success!',
    critFailAudio:    './assets/audio/english/critical_fail.mp3',
    critSuccessAudio: './assets/audio/english/critical_success.mp3',
    historyTitle: 'History',
    historyEmpty: 'No rolls yet',
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

/* ── Construit l'annonce complète : "Lancer d{faces}, résultat : {result}" (ou son équivalent EN) ──
   Chaque segment porte le silence à respecter après sa lecture. ── */
function buildRollAnnouncementSegments(faces, result, lang = 'fr') {
  const t = LANGUAGES[lang];
  const segments = [];
  segments.push({ file: t.lancer, gap: GAP_BETWEEN_WORDS });
  segments.push({ file: t.d, gap: GAP_BETWEEN_WORDS });
  pushNumberSegments(segments, faces, t.buildNumber);
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
function speak(faces, result, critFail, critSuccess, lang, onDone) {
  ctx(); // s'assure que audioCtx existe avant le décodage

  const segments = buildRollAnnouncementSegments(faces, result, lang);
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
    speech(faces, result, critFail, critSuccess, lang, onDone);
  });
}

function speech(faces, result, critFail, critSuccess, lang, onDone) {
  const t = LANGUAGES[lang];
  let text = t.announce(faces, result);
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

/* ── Affiche l'historique des lancers ── */
function renderHistory() {
  const list = document.getElementById('historyList');
  const t = LANGUAGES[currentLanguage];

  if (rollHistory.length === 0) {
    list.innerHTML = `<li class="list-group-item bg-transparent text-body-secondary text-center small">${t.historyEmpty}</li>`;
    return;
  }

  list.innerHTML = rollHistory.map(({ faces, result, isCritFail, isCritSuccess }) => {
    const resultClass = isCritFail ? 'text-danger fw-bold' : isCritSuccess ? 'text-warning fw-bold' : 'fw-semibold';
    return `<li class="list-group-item bg-transparent d-flex justify-content-between align-items-center">
      <span class="text-body-secondary">d${faces}</span>
      <span class="${resultClass}">${result}</span>
    </li>`;
  }).join('');
}

/* ── Scramble animation ── */
function scramble(finalVal, faces, done) {
  const el     = document.getElementById('resultValue');
  const frames = 14;
  let   count  = 0;
  el.classList.add('rolling');

  const id = setInterval(() => {
    el.textContent = Math.floor(Math.random() * faces) + 1;
    if (++count >= frames) {
      clearInterval(id);
      el.classList.remove('rolling');
      el.textContent = finalVal;
      done && done();
    }
  }, 55);
}

/* ── Main roll ── */
function roll(faces) {
  if (busy) return;
  ensureSpeech(); // doit être appelé ici, synchrone, dans le geste utilisateur
  busy    = true;
  lastDie = faces;

  const result = rollDie(faces);

  // Reset UI
  const panel = document.getElementById('panel');
  const valEl = document.getElementById('resultValue');
  panel.classList.remove('critical-fail', 'critical-success');
  panel.classList.add('active');
  valEl.classList.remove('critical-fail', 'critical-success', 'rolling');
  document.getElementById('resultLabel').textContent = `d${faces}`;
  valEl.textContent = '…';
  document.getElementById('rerollBtn').classList.remove('visible');
  document.querySelectorAll(".die-btn").forEach(d => d.classList.remove('current'))
  document.getElementById(`d${faces}`).classList.add('current');


  const isCritFail    = isCriticalFail(faces, result);
  const isCritSuccess = isCriticalSuccess(faces, result);

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
  speak(faces, result, isCritFail, isCritSuccess, currentLanguage, () => {
    const t = LANGUAGES[currentLanguage];
    const critClip = isCritFail ? t.critFailAudio : isCritSuccess ? t.critSuccessAudio : null;
    if (critClip) {
      playClip(critClip, () => { audioDone = true; maybeFinish(); });
    } else {
      audioDone = true;
      maybeFinish();
    }
  });

  scramble(result, faces, () => {
    // Apply critical visual state
    if (isCritFail) {
      panel.classList.add('critical-fail');
      valEl.classList.add('critical-fail');
    } else if (isCritSuccess) {
      panel.classList.add('critical-success');
      valEl.classList.add('critical-success');
    }

    rollHistory = pushHistoryEntry(rollHistory, { faces, result, isCritFail, isCritSuccess });
    renderHistory();

    scrambleDone = true;
    maybeFinish();
  });
}

function reroll() {
  if (lastDie) roll(lastDie);
}

/* ── Sélecteur de langue FR ⇄ EN ── */
function applyLanguage() {
  const t = LANGUAGES[currentLanguage];
  document.getElementById('appTitle').textContent = t.title;
  document.getElementById('hintText').textContent = t.hint;
  document.getElementById('rerollBtn').textContent = t.reroll;
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
}

/* ── Pre-load voices (browsers load async) ── */
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

if (typeof document !== 'undefined') {
  applyLanguage();
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-dropdown')) closeLangMenu();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    rollDie, isCriticalFail, isCriticalSuccess, pushHistoryEntry,
    buildAudioFileList, buildAudioFileListEnglish,
    buildRollAnnouncementSegments,
  };
}
