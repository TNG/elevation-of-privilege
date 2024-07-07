import { it, expect } from 'vitest';

import { DEFAULT_GAME_MODE } from './GameMode';
import { getStartingCard } from './cardDefinitions';
import { DEFAULT_START_SUIT, ModelType } from './constants';
import {
  escapeMarkdownText,
  getComponentName,
  getDealtCard,
  getPlayers,
  getValidMoves,
  grammarJoin,
  resolvePlayerName,
  resolvePlayerNames,
} from './utils';

import type { GameState } from '../game/gameState';

const baseG: GameState = {
  dealt: [],
  dealtBy: '',
  passed: [],
  suit: undefined,
  players: [['T2'], ['T3'], ['T4']],
  round: 0,
  numCardsPlayed: 0,
  scores: [0, 0],
  lastWinner: 0,
  maxRounds: 10,
  selectedDiagram: 0,
  selectedComponent: 'some-component',
  selectedThreat: 'some-threat',
  threat: {
    modal: false,
    new: true,
  },
  identifiedThreats: [],
  startingCard: 'the starting card',
  gameMode: DEFAULT_GAME_MODE,
  turnDuration: 0,
  modelType: ModelType.PRIVACY_ENHANCED,
};

it('getDealtCard() should get empty card if no card dealt', () => {
  const dealtCard = getDealtCard(baseG);

  expect(dealtCard).toBe('');
});

it('getDealtCard() should get correct card if a single card is dealt', () => {
  const G: GameState = {
    ...baseG,
    dealt: [null, null, 'E3'],
    dealtBy: '2',
  };

  const dealtCard = getDealtCard(G);

  expect(dealtCard).toBe('E3');
});

it('getDealtCard() should get correct card if a multiple cards are dealt', () => {
  const G: GameState = {
    ...baseG,
    dealt: ['E8', 'EA', 'E3'],
    dealtBy: '1',
  };

  const dealtCard = getDealtCard(G);

  expect(dealtCard).toBe('EA');
});

it('resolves player names correctly', () => {
  const names = ['foo', 'bar', 'baz'];
  expect(resolvePlayerNames(['0', '1', '2'], names, null)).toStrictEqual(names);

  expect(resolvePlayerNames(['1', '0', '2'], names, '1')).toStrictEqual([
    'You',
    'foo',
    'baz',
  ]);
});

it('resolves player name correctly', () => {
  const names = ['foo', 'bar', 'baz'];
  expect(resolvePlayerName('0', names, null)).toBe(names[0]);

  expect(resolvePlayerName('0', names, '0')).toBe('You');
});

it('gammer joins correctly', () => {
  expect(grammarJoin(['foo', 'bar', 'baz'])).toBe('foo, bar and baz');
  expect(grammarJoin(['foo', 'bar'])).toBe('foo and bar');
  expect(grammarJoin(['foo'])).toBe('foo');
  expect(grammarJoin([])).toBeUndefined();
});

it('creates player array correctly', () => {
  expect(getPlayers(3)).toStrictEqual(['0', '1', '2']);
});

it('makes correct component name', () => {
  expect(getComponentName(undefined)).toBe('');
  expect(
    getComponentName({
      type: 'tm.Actor',
      attrs: {
        text: {
          text: 'Bar',
        },
      },
      id: 'some-id',
      size: { width: 0, height: 0 },
      z: 0,
    }),
  ).toBe('Actor: Bar');
  expect(
    getComponentName({
      type: 'tm.Flow',
      labels: [
        {
          attrs: {
            text: {
              text: 'Bar',
              'font-size': '12pt',
              'font-weight': 'bold',
            },
          },
          position: 0,
        },
      ],
      attrs: {},
      id: 'some-id',
      size: { width: 0, height: 0 },
      z: 0,
    }),
  ).toBe('Flow: Bar');
});

it('produces valid moves', () => {
  const startingCard = getStartingCard(DEFAULT_GAME_MODE, DEFAULT_START_SUIT);
  expect(getValidMoves([], undefined, 0, startingCard)).toStrictEqual([
    startingCard,
  ]);

  expect(
    getValidMoves(['T4', 'S2', 'EA', 'T5'], 'T', 10, startingCard),
  ).toStrictEqual(['T4', 'T5']);

  expect(getValidMoves(['S2', 'EA'], 'T', 10, startingCard)).toStrictEqual([
    'S2',
    'EA',
  ]);
});

// TODO: add proper tests getSuitDisplayName

it('successfully escapes any malicious markdown text', () => {
  expect(
    escapeMarkdownText(
      '![The goodest boy](https://images.unsplash.com/the_good_boy.png)',
    ),
  ).toBe(
    '\\!\\[The goodest boy\\]\\(https://images.unsplash.com/the_good_boy.png\\)',
  );

  expect(
    escapeMarkdownText('<a href="javascript:alert(\'XSS\')">Click Me</a>'),
  ).toBe('&lt;a href="javascript:alert\\(\'XSS\'\\)"&gt;Click Me&lt;/a&gt;');

  expect(escapeMarkdownText('![Uh oh...]("onerror="alert(\'XSS\'))')).toBe(
    '\\!\\[Uh oh...\\]\\("onerror="alert\\(\'XSS\'\\)\\)',
  );
});
