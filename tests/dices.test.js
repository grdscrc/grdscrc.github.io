const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { rollDie, isCriticalFail, isCriticalSuccess, buildAudioFileList } = require('../assets/dices.js');

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
    [71,  ['./assets/audio/60.mp3', './assets/audio/11.mp3']],
    [76,  ['./assets/audio/60.mp3', './assets/audio/16.mp3']],
    [77,  ['./assets/audio/60.mp3', './assets/audio/10.mp3', './assets/audio/07.mp3']],
    [79,  ['./assets/audio/60.mp3', './assets/audio/10.mp3', './assets/audio/09.mp3']],
    [80,  ['./assets/audio/04.mp3', './assets/audio/20.mp3']],
    [81,  ['./assets/audio/04.mp3', './assets/audio/20.mp3', './assets/audio/01.mp3']],
    [96,  ['./assets/audio/04.mp3', './assets/audio/20.mp3', './assets/audio/16.mp3']],
    [100, ['./assets/audio/100.mp3']],
  ];

  for (const [number, expected] of cases) {
    test(`${number} → ${expected.join(' + ')}`, () => {
      assert.deepEqual(buildAudioFileList(number), expected);
    });
  }

  // Comportement actuel documenté (probables bugs de la table FR, non corrigés ici) :
  test('70 ne renvoie que "soixante" (pas de fichier "dix")', () => {
    assert.deepEqual(buildAudioFileList(70), ['./assets/audio/60.mp3']);
  });

  test('97-99 produisent un nom de fichier à 3 chiffres ("017.mp3"…)', () => {
    assert.deepEqual(buildAudioFileList(97), [
      './assets/audio/04.mp3', './assets/audio/20.mp3', './assets/audio/10.mp3', './assets/audio/017.mp3',
    ]);
  });
});
