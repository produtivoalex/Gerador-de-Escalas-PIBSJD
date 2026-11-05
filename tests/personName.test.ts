import test from 'node:test';
import assert from 'node:assert/strict';
import { splitCompoundName } from '../components/AutoBreakPersonName';

test('splitCompoundName handles single names without splitting', () => {
  assert.equal(splitCompoundName('Alex'), null);
  assert.equal(splitCompoundName('Teresa'), null);
  assert.equal(splitCompoundName('Ryan'), null);
  assert.equal(splitCompoundName(''), null);
  assert.equal(splitCompoundName('   '), null);
});

test('splitCompoundName splits two-word compound names into two distinct parts', () => {
  assert.deepEqual(splitCompoundName('Francisco Antonio'), {
    firstPart: 'Francisco',
    secondPart: 'Antonio'
  });
  assert.deepEqual(splitCompoundName('Maria José'), {
    firstPart: 'Maria',
    secondPart: 'José'
  });
  assert.deepEqual(splitCompoundName('Francisca Alves'), {
    firstPart: 'Francisca',
    secondPart: 'Alves'
  });
  assert.deepEqual(splitCompoundName('Antonia Maria'), {
    firstPart: 'Antonia',
    secondPart: 'Maria'
  });
  assert.deepEqual(splitCompoundName('Pr. Lourival'), {
    firstPart: 'Pr.',
    secondPart: 'Lourival'
  });
  assert.deepEqual(splitCompoundName('Fco. Antonio'), {
    firstPart: 'Fco.',
    secondPart: 'Antonio'
  });
});

test('splitCompoundName handles three-word compound names with prepositions', () => {
  assert.deepEqual(splitCompoundName('Francisco das Chagas'), {
    firstPart: 'Francisco',
    secondPart: 'das Chagas'
  });
  assert.deepEqual(splitCompoundName('Maria de Fatima'), {
    firstPart: 'Maria',
    secondPart: 'de Fatima'
  });
});

test('splitCompoundName balances longer compound names', () => {
  const result = splitCompoundName('Antonia Maria da Silva');
  assert.ok(result);
  assert.equal(result.firstPart, 'Antonia Maria');
  assert.equal(result.secondPart, 'da Silva');
});

