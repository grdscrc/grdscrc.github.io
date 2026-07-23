const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  rollDie, isCriticalFail, isCriticalSuccess, pushHistoryEntry,
  buildAudioFileList, buildAudioFileListEnglish,
  buildRollAnnouncementSegments,
} = require('../assets/dices.js');

describe('rollDie', () => {
  test('applies the injected rng to the requested face count', () => {
    assert.equal(rollDie(20, () => 0), 1);
    assert.equal(rollDie(20, () => 0.999999), 20);
    assert.equal(rollDie(6, () => 0.5), 4);
  });

  test('stays within [1, faces] for random rolls', () => {
    for (const faces of [4, 6, 8, 10, 12, 20, 100]) {
      for (let i = 0; i < 200; i++) {
        const result = rollDie(faces);
        assert.ok(result >= 1 && result <= faces, `d${faces} gave ${result}`);
        assert.equal(Number.isInteger(result), true);
      }
    }
  });
});

describe('isCriticalFail', () => {
  test('true only when faces >= 12 and the roll is 1', () => {
    assert.equal(isCriticalFail(20, 1), true);
    assert.equal(isCriticalFail(12, 1), true);
  });

  test('false below the d12 threshold, even on a 1', () => {
    assert.equal(isCriticalFail(4, 1), false);
    assert.equal(isCriticalFail(6, 1), false);
    assert.equal(isCriticalFail(10, 1), false);
  });

  test('false when the roll is not 1', () => {
    assert.equal(isCriticalFail(20, 2), false);
    assert.equal(isCriticalFail(20, 20), false);
  });
});

describe('isCriticalSuccess', () => {
  test('true only when faces >= 12 and the roll equals faces', () => {
    assert.equal(isCriticalSuccess(20, 20), true);
    assert.equal(isCriticalSuccess(12, 12), true);
  });

  test('false below the d12 threshold, even on a max roll', () => {
    assert.equal(isCriticalSuccess(4, 4), false);
    assert.equal(isCriticalSuccess(6, 6), false);
    assert.equal(isCriticalSuccess(10, 10), false);
  });

  test('false when the roll does not equal faces', () => {
    assert.equal(isCriticalSuccess(20, 19), false);
    assert.equal(isCriticalSuccess(20, 1), false);
  });
});

describe('pushHistoryEntry', () => {
  test('prepends the new entry to the front (most recent first)', () => {
    const history = pushHistoryEntry([{ faces: 6, result: 3 }], { faces: 20, result: 14 });
    assert.deepEqual(history, [{ faces: 20, result: 14 }, { faces: 6, result: 3 }]);
  });

  test('caps the history at maxItems, dropping the oldest entry', () => {
    let history = [];
    history = pushHistoryEntry(history, { faces: 6, result: 1 }, 3);
    history = pushHistoryEntry(history, { faces: 6, result: 2 }, 3);
    history = pushHistoryEntry(history, { faces: 6, result: 3 }, 3);
    history = pushHistoryEntry(history, { faces: 6, result: 4 }, 3);
    assert.deepEqual(history, [
      { faces: 6, result: 4 },
      { faces: 6, result: 3 },
      { faces: 6, result: 2 },
    ]);
  });

  test('defaults to a cap of 20 when maxItems is omitted', () => {
    let history = [];
    for (let i = 1; i <= 25; i++) {
      history = pushHistoryEntry(history, { faces: 6, result: i });
    }
    assert.equal(history.length, 20);
    assert.deepEqual(history[0], { faces: 6, result: 25 });
    assert.deepEqual(history[19], { faces: 6, result: 6 });
  });
});

describe('buildAudioFileList', () => {
  const cases = [
    // [number, expected files]
    [0,   ['./assets/audio/00.mp3']],
    [1,   ['./assets/audio/01.mp3']],
    [16,  ['./assets/audio/16.mp3']],
    [17,  ['./assets/audio/10.mp3', './assets/audio/07.mp3']],
    [19,  ['./assets/audio/10.mp3', './assets/audio/09.mp3']],
    [20,  ['./assets/audio/20.mp3']],
    [21,  ['./assets/audio/20.mp3', './assets/audio/et.mp3', './assets/audio/01.mp3']],
    [25,  ['./assets/audio/20.mp3', './assets/audio/05.mp3']],
    [61,  ['./assets/audio/60.mp3', './assets/audio/et.mp3', './assets/audio/01.mp3']],
    [69,  ['./assets/audio/60.mp3', './assets/audio/09.mp3']],
    [71,  ['./assets/audio/60.mp3', './assets/audio/et.mp3', './assets/audio/11.mp3']],
    [76,  ['./assets/audio/60.mp3', './assets/audio/16.mp3']],
    [77,  ['./assets/audio/70.mp3', './assets/audio/07.mp3']],
    [79,  ['./assets/audio/70.mp3', './assets/audio/09.mp3']],
    [70,  ['./assets/audio/70.mp3']],
    [80,  ['./assets/audio/80.mp3']],
    [81,  ['./assets/audio/80.mp3', './assets/audio/01.mp3']],
    [90,  ['./assets/audio/90.mp3']],
    [91,  ['./assets/audio/80.mp3', './assets/audio/11.mp3']],
    [96,  ['./assets/audio/80.mp3', './assets/audio/16.mp3']],
    [100, ['./assets/audio/100.mp3']],
  ];

  for (const [number, expected] of cases) {
    test(`${number} → ${expected.join(' + ')}`, () => {
      assert.deepEqual(buildAudioFileList(number), expected);
    });
  }

  // 97-99 = "quatre-vingt-dix-{sept,huit,neuf}" = quatre-vingt + dix + {7,8,9}, fichiers à 2 chiffres
  test('97 → quatre-vingt + dix + sept', () => {
    assert.deepEqual(buildAudioFileList(97), [
      './assets/audio/90.mp3', './assets/audio/07.mp3',
    ]);
  });

  test('98 → quatre-vingt + dix + huit', () => {
    assert.deepEqual(buildAudioFileList(98), [
      './assets/audio/90.mp3', './assets/audio/08.mp3',
    ]);
  });

  test('99 → quatre-vingt + dix + neuf', () => {
    assert.deepEqual(buildAudioFileList(99), [
      './assets/audio/90.mp3', './assets/audio/09.mp3',
    ]);
  });
});

describe('buildAudioFileListEnglish', () => {
  const cases = [
    // [number, expected files]
    [1,   ['./assets/audio/english/01.mp3']],
    [16,  ['./assets/audio/english/16.mp3']],
    [17,  ['./assets/audio/english/17.mp3']],   // pas de décomposition : "seventeen" est un mot entier
    [20,  ['./assets/audio/english/20.mp3']],
    [21,  ['./assets/audio/english/20.mp3', './assets/audio/english/01.mp3']],
    [30,  ['./assets/audio/english/30.mp3']],   // "thirty" seul, pas d'unité à ajouter
    [70,  ['./assets/audio/english/70.mp3']],
    [77,  ['./assets/audio/english/70.mp3', './assets/audio/english/07.mp3']],
    [99,  ['./assets/audio/english/90.mp3', './assets/audio/english/09.mp3']],
    [100, ['./assets/audio/english/100.mp3']],
  ];

  for (const [number, expected] of cases) {
    test(`${number} → ${expected.join(' + ')}`, () => {
      assert.deepEqual(buildAudioFileListEnglish(number), expected);
    });
  }
});

describe('buildRollAnnouncementSegments', () => {
  const WORD   = 0.02;  // silence entre deux mots/phrases distincts
  const WITHIN = 0; // silence entre les syllabes d'un même nombre composé

  const seg = (file, gap) => ({ file: `./assets/audio/${file}`, gap });

  test('"Lancer d20, résultat : 14" — un seul fichier par nombre, silences normaux', () => {
    assert.deepEqual(buildRollAnnouncementSegments(20, 14), [
      seg('lancer.mp3', WORD),
      seg('d.mp3', WORD),
      seg('20.mp3', WORD),
      seg('resultat.mp3', WORD),
      seg('14.mp3', WORD),
    ]);
  });

  test('"Lancer d4, résultat : 1"', () => {
    assert.deepEqual(buildRollAnnouncementSegments(4, 1), [
      seg('lancer.mp3', WORD),
      seg('d.mp3', WORD),
      seg('04.mp3', WORD),
      seg('resultat.mp3', WORD),
      seg('01.mp3', WORD),
    ]);
  });

  test('"Lancer d20, résultat : 99" — nombre composé : silences courts entre ses syllabes', () => {
    assert.deepEqual(buildRollAnnouncementSegments(20, 99), [
      seg('lancer.mp3', WORD),
      seg('d.mp3', WORD),
      seg('20.mp3', WORD),
      seg('resultat.mp3', WORD),
      seg('90.mp3', WITHIN),
      seg('09.mp3', WORD), // dernière syllabe : silence normal avant la suite (ou la fin)
    ]);
  });

  test('"Lancer d20, résultat : 21" (résultat composé avec "et")', () => {
    assert.deepEqual(buildRollAnnouncementSegments(20, 21), [
      seg('lancer.mp3', WORD),
      seg('d.mp3', WORD),
      seg('20.mp3', WORD),
      seg('resultat.mp3', WORD),
      seg('20.mp3', WITHIN),
      seg('et.mp3', WITHIN),
      seg('01.mp3', WORD),
    ]);
  });

  const segEn = (file, gap) => ({ file: `./assets/audio/english/${file}`, gap });

  test('EN — "Throwing d20, result: 14"', () => {
    assert.deepEqual(buildRollAnnouncementSegments(20, 14, 'en'), [
      segEn('throwing.mp3', WORD),
      segEn('d.mp3', WORD),
      segEn('20.mp3', WORD),
      segEn('result.mp3', WORD),
      segEn('14.mp3', WORD),
    ]);
  });

  test('EN — "Throwing d20, result: 99" — nombre composé', () => {
    assert.deepEqual(buildRollAnnouncementSegments(20, 99, 'en'), [
      segEn('throwing.mp3', WORD),
      segEn('d.mp3', WORD),
      segEn('20.mp3', WORD),
      segEn('result.mp3', WORD),
      segEn('90.mp3', WITHIN),
      segEn('09.mp3', WORD),
    ]);
  });
});
