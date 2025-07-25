import { INVALID_MOVE } from 'boardgame.io/core';
import { v4 as uuidv4 } from 'uuid';

import { getDealtCard, getValidMoves } from '../utils/utils';
import { getThreatDescription } from './definitions';
import { hasPlayerPassed } from './utils';

import type { MoveFn } from 'boardgame.io';
import type { Suit } from '../utils/cardDefinitions';
import type { GameState } from './gameState';
import type { Threat } from './threat';

type MoveFnContext<G> = Parameters<MoveFn<G>>[0];

export const toggleModal: MoveFn<GameState> = ({ G, playerID }) => {
  // if the player has passed, they shouldn't be able to toggle the modal
  if (
    hasPlayerPassed(G, playerID) ||
    (G.threat.modal && G.threat.owner !== playerID) ||
    G.suit === undefined
  ) {
    return INVALID_MOVE;
  }
  const card = getDealtCard(G);

  G.threat = {
    modal: !G.threat.modal,
    new: true,
    owner: playerID,
    type: G.suit,
    id: uuidv4(),
    title: '',
    severity: 'Medium',
    description: getThreatDescription(card, G.gameMode),
    mitigation: '',
  };
};

export const toggleModalUpdate: MoveFn<GameState> = (
  { G, playerID },
  threat: Threat,
) => {
  // if the player has passed, they shouldn't be able to toggle the modal
  if (hasPlayerPassed(G, playerID) || threat.owner !== playerID) {
    return INVALID_MOVE;
  }

  G.threat = {
    modal: !G.threat.modal,
    new: false,
    id: threat.id,
    owner: playerID,
    title: threat.title,
    type: threat.type,
    severity: threat.severity,
    description: threat.description,
    mitigation: threat.mitigation,
  };
};

export function updateThreat<Field extends keyof Threat>(
  { G }: MoveFnContext<GameState>,
  field: Field,
  value: Threat[Field],
): ReturnType<MoveFn<GameState>> {
  G.threat[field] = value;
}

export const selectDiagram: MoveFn<GameState> = (
  { G, playerID },
  id: number,
) => {
  // if the player has passed, they shouldn't be able to select diagrams
  if (hasPlayerPassed(G, playerID)) {
    return INVALID_MOVE;
  }

  G.selectedDiagram = id;
  G.selectedComponent = '';
  G.selectedThreat = '';
};

export const selectComponent: MoveFn<GameState> = (
  { G, playerID },
  id: string,
) => {
  // if the player has passed, they shouldn't be able to select components
  if (hasPlayerPassed(G, playerID)) {
    return INVALID_MOVE;
  }

  G.selectedComponent = id;
  G.selectedThreat = '';
};

export const selectThreat: MoveFn<GameState> = (
  { G, playerID },
  id: string,
) => {
  // if the player has passed, they shouldn't be able to select threat
  if (hasPlayerPassed(G, playerID)) {
    return INVALID_MOVE;
  }

  G.selectedThreat = id;
};

export const pass: MoveFn<GameState> = ({ G, playerID }) => {
  if (playerID === undefined) {
    return INVALID_MOVE;
  }

  const passed = [...G.passed];

  if (!hasPlayerPassed(G, playerID)) {
    passed.push(playerID);
  }

  G.passed = passed;
};

export const deleteThreat: MoveFn<GameState> = (
  { G, playerID },
  threat: Threat & { id: string },
) => {
  // Check for prototype pollution vulnerabilities
  if (
    isDangerousKey(G.selectedDiagram) ||
    isDangerousKey(G.selectedComponent)
  ) {
    return INVALID_MOVE;
  }

  // if the player has passed, they shouldn't be able to toggle the modal
  if (
    hasPlayerPassed(G, playerID) ||
    threat.owner !== playerID ||
    playerID === undefined ||
    G.identifiedThreats[G.selectedDiagram]?.[G.selectedComponent]?.[
      threat.id
    ] === undefined
  ) {
    return INVALID_MOVE;
  }

  const playerIDAsNumber = Number.parseInt(playerID);
  if (G.scores[playerIDAsNumber] !== undefined) {
    G.scores[playerIDAsNumber]--;
  }
  if (
    G.identifiedThreats[G.selectedDiagram]?.[G.selectedComponent] !== undefined
  ) {
    delete G.identifiedThreats[G.selectedDiagram]![G.selectedComponent]![
      threat.id
    ];
  }
  G.selectedThreat = '';
};

export const addOrUpdateThreat: MoveFn<GameState> = ({ G, playerID }) => {
  const threatTitle = G.threat.title?.trim();
  const threatDescription = G.threat.description?.trim();
  const threatMitigation = G.threat.mitigation?.trim();

  // Check for prototype pollution vulnerabilities
  if (
    isDangerousKey(G.selectedDiagram) ||
    isDangerousKey(G.selectedComponent) ||
    isDangerousKey(G.threat.id)
  ) {
    return INVALID_MOVE;
  }

  if (
    playerID === undefined ||
    G.threat.owner !== playerID ||
    threatTitle === undefined ||
    threatTitle === '' ||
    threatDescription === undefined ||
    G.threat.id === undefined
  ) {
    return INVALID_MOVE;
  }

  // only update score if it's a new threat
  const playerIDAsNumber = Number.parseInt(playerID);
  if (G.threat.new && G.scores[playerIDAsNumber] !== undefined) {
    G.scores[playerIDAsNumber]++;
  }

  G.threat.modal = false;
  G.selectedThreat = G.threat.id;

  // initialize identified threats for the selected diagram and component if it doesn't exist yet
  if (G.identifiedThreats[G.selectedDiagram] === undefined) {
    G.identifiedThreats[G.selectedDiagram] = {};
  }
  if (
    G.identifiedThreats[G.selectedDiagram]![G.selectedComponent] === undefined
  ) {
    G.identifiedThreats[G.selectedDiagram]![G.selectedComponent] = {};
  }

  // add/update identified threat
  G.identifiedThreats[G.selectedDiagram]![G.selectedComponent]![G.threat.id] = {
    ...G.threat,
    title: threatTitle,
    description: threatDescription,
    mitigation: threatMitigation || 'No mitigation provided.',
  };
};

export const draw: MoveFn<GameState> = ({ G, ctx, events }, card: string) => {
  const currentPlayerNumber = Number.parseInt(ctx.currentPlayer);
  const deck = G.players[currentPlayerNumber];

  // check if the move is valid
  if (
    deck === undefined ||
    !getValidMoves(deck, G.suit, G.round, G.startingCard).includes(card)
  ) {
    return INVALID_MOVE;
  }

  deck.splice(deck.indexOf(card), 1);
  G.dealt[parseInt(ctx.currentPlayer)] = card;
  G.numCardsPlayed++;
  G.suit = G.suit ?? (card.slice(0, 1) as Suit); // only update the suit if no suit exists
  G.dealtBy = ctx.currentPlayer;
  G.turnFinishTargetTime = Date.now() + G.turnDuration * 1000;

  // move into threats stage
  events.setActivePlayers({ all: 'threats' });
};

function isDangerousKey(key: string | number | undefined): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
