const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  createFullBag, drawMarble, isCriticalFail, isCriticalSuccess, pushHistoryEntry,
  buildAudioFileList, buildAudioFileListEnglish,
  buildDrawAnnouncementSegments,
} = require('../assets/marbles.js');

describe('createFullBag', () => {
  test('contains exactly one marble per value from 1 to size', () => {
    assert.deepEqual(createFullBag(6), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(createFullBag(4), [1, 2, 3, 4]);
  });
});

describe('drawMarble', () => {
  test('applies the injected rng to pick a marble from the bag', () => {
    assert.equal(drawMarble([1, 2, 3, 4], 4, () => 0).value, 1);
    assert.equal(drawMarble([1, 2, 3, 4], 4, () => 0.999999).value, 4);
    assert.equal(drawMarble([1, 2, 3, 4], 4, () => 0.5).value, 3);
  });

  test('removes the drawn marble from the returned remaining bag', () => {
    const { value, remaining } = drawMarble([1, 2, 3, 4], 4, () => 0.5);
    assert.equal(remaining.length, 3);
    assert.equal(remaining.includes(value), false);
    assert.deepEqual(remaining.sort(), [1, 2, 4]);
  });

  test('refills the bag when it is empty or missing', () => {
    assert.equal(drawMarble([], 6, () => 0).value, 1);
    assert.equal(drawMarble(undefined, 6, () => 0).value, 1);
  });

  test('never draws the same marble twice before the bag is exhausted', () => {
    let bag = undefined;
    const seen = [];
    for (let i = 0; i < 20; i++) {
      const { value, remaining } = drawMarble(bag, 20);
      assert.equal(seen.includes(value), false, `marble ${value} drawn twice within one cycle`);
      seen.push(value);
      bag = remaining;
    }
    assert.deepEqual(seen.sort((a, b) => a - b), createFullBag(20));
    assert.equal(bag.length, 0);
  });

  test('stays within [1, size] and yields an integer', () => {
    for (const size of [4, 6, 8, 10, 12, 20, 100]) {
      let bag = undefined;
      for (let i = 0; i < 200; i++) {
        const { value, remaining } = drawMarble(bag, size);
        assert.ok(value >= 1 && value <= size, `bag(1-${size}) gave ${value}`);
        assert.equal(Number.isInteger(value), true);
        bag = remaining;
      }
    }
  });
});

describe('isCriticalFail', () => {
  test('true only when size >= 12 and the draw is 1', () => {
    assert.equal(isCriticalFail(20, 1), true);
    assert.equal(isCriticalFail(12, 1), true);
  });

  test('false below the 12-marble threshold, even on a 1', () => {
    assert.equal(isCriticalFail(4, 1), false);
    assert.equal(isCriticalFail(6, 1), false);
    assert.equal(isCriticalFail(10, 1), false);
  });

  test('false when the draw is not 1', () => {
    assert.equal(isCriticalFail(20, 2), false);
    assert.equal(isCriticalFail(20, 20), false);
  });
});

describe('isCriticalSuccess', () => {
  test('true only when size >= 12 and the draw equals size', () => {
    assert.equal(isCriticalSuccess(20, 20), true);
    assert.equal(isCriticalSuccess(12, 12), true);
  });

  test('false below the 12-marble threshold, even on a max draw', () => {
    assert.equal(isCriticalSuccess(4, 4), false);
    assert.equal(isCriticalSuccess(6, 6), false);
    assert.equal(isCriticalSuccess(10, 10), false);
  });

  test('false when the draw does not equal size', () => {
    assert.equal(isCriticalSuccess(20, 19), false);
    assert.equal(isCriticalSuccess(20, 1), false);
  });
});

describe('pushHistoryEntry', () => {
  test('prepends the new entry to the front (most recent first)', () => {
    const history = pushHistoryEntry([{ size: 6, result: 3 }], { size: 20, result: 14 });
    assert.deepEqual(history, [{ size: 20, result: 14 }, { size: 6, result: 3 }]);
  });

  test('caps the history at maxItems, dropping the oldest entry', () => {
    let history = [];
    history = pushHistoryEntry(history, { size: 6, result: 1 }, 3);
    history = pushHistoryEntry(history, { size: 6, result: 2 }, 3);
    history = pushHistoryEntry(history, { size: 6, result: 3 }, 3);
    history = pushHistoryEntry(history, { size: 6, result: 4 }, 3);
    assert.deepEqual(history, [
      { size: 6, result: 4 },
      { size: 6, result: 3 },
      { size: 6, result: 2 },
    ]);
  });

  test('defaults to a cap of 20 when maxItems is omitted', () => {
    let history = [];
    for (let i = 1; i <= 25; i++) {
      history = pushHistoryEntry(history, { size: 6, result: i });
    }
    assert.equal(history.length, 20);
    assert.deepEqual(history[0], { size: 6, result: 25 });
    assert.deepEqual(history[19], { size: 6, result: 6 });
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
    [100, ['./assets/audio/100.mp3']],
  ];

  for (const [number, expected] of cases) {
    test(`${number} → ${expected.join(' + ')}`, () => {
      assert.deepEqual(buildAudioFileList(number), expected);
    });
  }
});

describe('buildAudioFileListEnglish', () => {
  const cases = [
    // [number, expected files]
    [1,   ['./assets/audio/english/01.mp3']],
    [16,  ['./assets/audio/english/16.mp3']],
    [21,  ['./assets/audio/english/20.mp3', './assets/audio/english/01.mp3']],
    [100, ['./assets/audio/english/100.mp3']],
  ];

  for (const [number, expected] of cases) {
    test(`${number} → ${expected.join(' + ')}`, () => {
      assert.deepEqual(buildAudioFileListEnglish(number), expected);
    });
  }
});

describe('buildDrawAnnouncementSegments', () => {
  const WORD   = 0.02;  // silence entre deux mots/phrases distincts
  const WITHIN = 0; // silence entre les syllabes d'un même nombre composé

  const seg = (file, gap) => ({ file: `./assets/audio/${file}`, gap });

  test('"Résultat : 14" — un seul fichier pour le nombre, silence normal', () => {
    assert.deepEqual(buildDrawAnnouncementSegments(14), [
      seg('resultat.mp3', WORD),
      seg('14.mp3', WORD),
    ]);
  });

  test('"Résultat : 1"', () => {
    assert.deepEqual(buildDrawAnnouncementSegments(1), [
      seg('resultat.mp3', WORD),
      seg('01.mp3', WORD),
    ]);
  });

  test('"Résultat : 99" — nombre composé : silences courts entre ses syllabes', () => {
    assert.deepEqual(buildDrawAnnouncementSegments(99), [
      seg('resultat.mp3', WORD),
      seg('90.mp3', WITHIN),
      seg('09.mp3', WORD), // dernière syllabe : silence normal avant la suite (ou la fin)
    ]);
  });

  test('"Résultat : 21" (composé avec "et")', () => {
    assert.deepEqual(buildDrawAnnouncementSegments(21), [
      seg('resultat.mp3', WORD),
      seg('20.mp3', WITHIN),
      seg('et.mp3', WITHIN),
      seg('01.mp3', WORD),
    ]);
  });

  const segEn = (file, gap) => ({ file: `./assets/audio/english/${file}`, gap });

  test('EN — "Result: 14"', () => {
    assert.deepEqual(buildDrawAnnouncementSegments(14, 'en'), [
      segEn('result.mp3', WORD),
      segEn('14.mp3', WORD),
    ]);
  });

  test('EN — "Result: 99" — nombre composé', () => {
    assert.deepEqual(buildDrawAnnouncementSegments(99, 'en'), [
      segEn('result.mp3', WORD),
      segEn('90.mp3', WITHIN),
      segEn('09.mp3', WORD),
    ]);
  });
});
