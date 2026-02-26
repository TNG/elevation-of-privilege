import type {PlayerID} from 'boardgame.io';
import type {GameState} from '../game/gameState';
import type {Card, Suit} from './cardDefinitions';
import {ModelType} from './constants';
import {CellV2} from "../game/ThreatDragonModel";

export function getDealtCard(G: GameState): string {
  if (G.dealt.length > 0 && G.dealtBy) {
    return G.dealt[Number.parseInt(G.dealtBy)] ?? '';
  }
  return '';
}

export function resolvePlayerNames(
  players: PlayerID[],
  names: string[],
  current: PlayerID | null,
): string[] {
  return players.map((player) => resolvePlayerName(player, names, current));
}

export function resolvePlayerName(
  player: PlayerID,
  names: string[],
  current: PlayerID | null,
): string {
  return player === current ? 'You' : (names[Number.parseInt(player)] ?? '');
}

export function grammarJoin(arr: string[]): string | undefined {
  const last = arr.pop();

  if (arr.length <= 0) return last;

  return arr.join(', ') + ' and ' + last;
}

export function getPlayers(count: number): string[] {
  const players = [];
  for (let i = 0; i < count; i++) {
    players.push(i + '');
  }
  return players;
}

export function getComponentName(component: CellV2 | undefined): string {
  if (!component) return '';

  const type = getV2CellType(component);
  const prefix = type.startsWith('tm.') ? type.slice(3) : type;

  if (type === 'tm.Flow') {
    const flowLabel = getV2FlowLabel(component);
    const fallbackName = getV2CellDisplayName(component);
    const name = flowLabel || fallbackName;
    return name ? `${prefix}: ${name}` : `${prefix}`;
  }

  const name = getV2CellDisplayName(component);
  return name ? `${prefix}: ${name}` : `${prefix}`;
}

export function getValidMoves(
  allCardsInHand: Card[],
  currentSuit: Suit | undefined,
  round: number,
  startingCard: Card,
): Card[] {
  if (!currentSuit && round <= 1) {
    return [startingCard];
  }

  const cardsOfSuit = getCardsOfSuit(allCardsInHand, currentSuit);

  return cardsOfSuit.length > 0 ? cardsOfSuit : allCardsInHand;
}

function getCardsOfSuit(cards: Card[], suit: Suit | undefined): Card[] {
  if (!suit) {
    return [];
  }
  return cards.filter((e) => e.startsWith(suit));
}

export function escapeMarkdownText(text: string): string {
  // replaces certain characters with an escaped version
  // doesn't escape * or _ to allow users to format the descriptions
  return text
    .replace(/[![\]()]/gm, '\\$&')
    .replace(/</gm, '&lt;')
    .replace(/>/gm, '&gt;');
}

export function getImageExtension(filename: string): string | undefined {
  const pattern = new RegExp(`\\.(?<extension>\\w+)$`);
  const matches = filename.match(pattern);
  if (matches && matches.groups && matches.groups.extension) {
    return matches.groups.extension;
  }
  return undefined;
}

export function asyncSetTimeout<U, F extends () => Promise<U>>(
  callback: F,
  delay: number,
): Promise<U> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      callback().then(resolve, reject);
    }, delay);
  });
}

export function logEvent(message: string): void {
  const now = new Date(Date.now()).toISOString();
  console.log(`${now} - ${message}`);
}

export function isModelType(value: string): value is ModelType {
  return Object.values<string>(ModelType).includes(value);
}


function getV2CellType(cell: CellV2): string {
  return typeof cell.data?.type === 'string' ? cell.data.type : '';
}

function getV2CellDisplayName(cell: CellV2): string {
  const dataName = cell.data?.name;
  if (typeof dataName === 'string' && dataName.trim()) return dataName;

  const attrs = cell.attrs;
  if (attrs && typeof attrs === 'object') {
    const t1 = (attrs as { text?: { text?: unknown } }).text?.text;
    if (typeof t1 === 'string' && t1.trim()) return t1;

    const t2 = (attrs as { label?: { text?: unknown } }).label?.text;
    if (typeof t2 === 'string' && t2.trim()) return t2;
  }

  return '';
}

function getV2FlowLabel(cell: CellV2): string {
  const labels = cell.labels ?? [];
  if (!Array.isArray(labels) || labels.length === 0) return '';

  const attrs = labels[0]?.attrs;
  if (!attrs || typeof attrs !== 'object') return '';

  const labelText = (attrs as { labelText?: { text?: unknown } }).labelText?.text;
  if (typeof labelText === 'string' && labelText.trim()) return labelText;

  const label = (attrs as { label?: { text?: unknown } }).label?.text;
  if (typeof label === 'string' && label.trim()) return label;

  return '';
}
