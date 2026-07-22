/* ── State ── */
let lastDie   = null;
let audioCtx  = null;
let busy      = false;
let speechReady = false;
let currentLanguage = 'fr';

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
    title:  '🎲 Dés Audio',
    hint:   'Appuie sur un dé — le résultat est annoncé à voix haute',
    reroll: '↺ Relancer le même dé',
    speechLang: 'fr-FR',
    announce: (faces, result) => `Lancer d${faces}, résultat : ${result}`,
    critFailSuffix:    ' : échec critique !',
    critSuccessSuffix: ' : succès critique !',
  },
  en: {
    lancer:   './assets/audio/english/throwing.mp3',
    d:        './assets/audio/english/d.mp3',
    resultat: './assets/audio/english/result.mp3',
    buildNumber: buildAudioFileListEnglish,
    title:  '🎲 Audio Dice',
    hint:   'Tap a die — the result is announced out loud',
    reroll: '↺ Reroll the same die',
    speechLang: 'en-US',
    announce: (faces, result) => `Throwing d${faces}, result: ${result}`,
    critFailSuffix:    ' : critical failure!',
    critSuccessSuffix: ' : critical success!',
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

/* ── Dice rolling sound ── */
function playRoll(callback) {
  const ac  = ctx();
  const now = ac.currentTime;
  const totalDur = 0.95;
  const nClicks  = 16;

  for (let i = 0; i < nClicks; i++) {
    // Clicks accelerate then decelerate (bell curve timing)
    const progress = i / (nClicks - 1);
    const t = now + totalDur * (1 - Math.pow(1 - progress, 2)) * 0.9;

    // Short noise burst per click
    const len    = Math.floor(ac.sampleRate * 0.045);
    const buf    = ac.createBuffer(1, len, ac.sampleRate);
    const data   = buf.getChannelData(0);
    const decay  = 0.12;
    for (let j = 0; j < len; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (len * decay));
    }

    const src  = ac.createBufferSource();
    src.buffer = buf;

    // Highpass → crisp "clack"
    const hp  = ac.createBiquadFilter();
    hp.type   = 'highpass';
    hp.frequency.value = 700 + Math.random() * 800;

    // Volume envelope — louder in the middle of the roll
    const env = ac.createGain();
    const vol = 0.15 + 0.4 * Math.sin(Math.PI * progress);
    env.gain.setValueAtTime(vol, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    src.connect(hp);
    hp.connect(env);
    env.connect(ac.destination);
    src.start(t);
  }

  setTimeout(callback, totalDur * 1000 + 120);
}

/* ── Sad trombone (wah-wah-wah-waaah) ── */
function playSadTrombone() {
  const ac  = ctx();
  const now = ac.currentTime;

  // Classic descending: Bb4 → G4 → Eb4 → C4 (pitch bend down)
  const notes = [
    { freq: 466, start: 0.0,  dur: 0.38 },
    { freq: 392, start: 0.34, dur: 0.38 },
    { freq: 311, start: 0.66, dur: 0.38 },
    { freq: 261, start: 0.98, dur: 1.3  }, // long sad hold + downward bend
  ];

  notes.forEach(({ freq, start, dur }, i) => {
    const osc  = ac.createOscillator();
    osc.type   = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + start);

    // Last note bends down sadly
    if (i === notes.length - 1) {
      osc.frequency.setValueAtTime(freq, now + start + 0.3);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.82, now + start + dur);
    }

    // Slow vibrato on last note
    if (i === notes.length - 1) {
      const lfo  = ac.createOscillator();
      lfo.type   = 'sine';
      lfo.frequency.value = 4.5;
      const lfoGain = ac.createGain();
      lfoGain.gain.setValueAtTime(0, now + start);
      lfoGain.gain.linearRampToValueAtTime(6, now + start + 0.5);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now + start);
      lfo.stop(now + start + dur + 0.05);
    }

    // Warm lowpass → muted brass character
    const lp  = ac.createBiquadFilter();
    lp.type   = 'lowpass';
    lp.frequency.value = 1400;
    lp.Q.value = 1.5;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.28, now + start + 0.04);
    gain.gain.setValueAtTime(0.28, now + start + dur - 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(ac.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  });
}

/* ── Heroic trumpet fanfare (ascending + triumphant hold) ── */
function playHeroicFanfare() {
  const ac  = ctx();
  const now = ac.currentTime;

  // G4 → C5 → E5 → G5 (bugle-style ascending, then hold)
  const notes = [
    { freq: 392, start: 0.0,  dur: 0.18 },
    { freq: 523, start: 0.16, dur: 0.18 },
    { freq: 659, start: 0.32, dur: 0.18 },
    { freq: 784, start: 0.48, dur: 0.85 }, // triumphant!
  ];

  notes.forEach(({ freq, start, dur }, i) => {
    const osc  = ac.createOscillator();
    osc.type   = 'sawtooth';
    osc.frequency.value = freq;

    // Slight upward pitch push at attack (trumpet articulation)
    osc.frequency.setValueAtTime(freq * 1.02, now + start);
    osc.frequency.exponentialRampToValueAtTime(freq, now + start + 0.04);

    // Bright bandpass for trumpet timbre
    const bp  = ac.createBiquadFilter();
    bp.type   = 'bandpass';
    bp.frequency.value = freq * 1.8;
    bp.Q.value = 0.7;

    // Second harmonic layer for richness
    const osc2  = ac.createOscillator();
    osc2.type   = 'square';
    osc2.frequency.value = freq * 2;

    const mixGain = ac.createGain();
    mixGain.gain.value = 0.12;

    const gain = ac.createGain();
    // Punchy attack, then slight decay on held note
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(i === notes.length - 1 ? 0.42 : 0.36, now + start + 0.025);
    if (i === notes.length - 1) {
      gain.gain.setValueAtTime(0.42, now + start + 0.1);
      gain.gain.linearRampToValueAtTime(0.32, now + start + dur - 0.15);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(bp);
    bp.connect(gain);
    osc2.connect(mixGain);
    mixGain.connect(gain);
    gain.connect(ac.destination);

    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
    osc2.start(now + start);
    osc2.stop(now + start + dur + 0.05);
  });
}

/* ── TTS ── */
function speak(faces, result, critFail, critSuccess, lang) {
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
    let t = audioCtx.currentTime;
    buffers.forEach((buffer, i) => {
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(t);
      t += buffer.duration + segments[i].gap;
    });
  }).catch(err => {
    console.error('Error fetching or playing audio:', err);
    speech(faces, result, critFail, critSuccess, lang);
  });
}

function speech(faces, result, critFail, critSuccess, lang) {
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

  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
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

  playRoll(() => {
    scramble(result, faces, () => {
      // Apply critical visual state
      if (isCritFail) {
        panel.classList.add('critical-fail');
        valEl.classList.add('critical-fail');
      } else if (isCritSuccess) {
        panel.classList.add('critical-success');
        valEl.classList.add('critical-success');
      }

      setTimeout(() => {
        speak(faces, result, isCritFail, isCritSuccess, currentLanguage);

        // Play special jingle after TTS starts
        if (isCritFail)    setTimeout(playSadTrombone,   2000);
        if (isCritSuccess) setTimeout(playHeroicFanfare, 2000);

        document.getElementById('rerollBtn').classList.add('visible');
        busy = false;
      }, 150);
    });
  });
}

function reroll() {
  if (lastDie) roll(lastDie);
}

/* ── Bascule FR ⇄ EN ── */
function applyLanguage() {
  const t = LANGUAGES[currentLanguage];
  document.getElementById('appTitle').textContent = t.title;
  document.getElementById('hintText').textContent = t.hint;
  document.getElementById('rerollBtn').textContent = t.reroll;
  document.documentElement.lang = currentLanguage;
}

function toggleLanguage() {
  currentLanguage = currentLanguage === 'fr' ? 'en' : 'fr';
  applyLanguage();
}

/* ── Pre-load voices (browsers load async) ── */
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

if (typeof document !== 'undefined') {
  applyLanguage();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    rollDie, isCriticalFail, isCriticalSuccess,
    buildAudioFileList, buildAudioFileListEnglish,
    buildRollAnnouncementSegments,
  };
}
