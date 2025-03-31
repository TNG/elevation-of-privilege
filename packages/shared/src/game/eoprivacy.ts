import { PlayerView, TurnOrder } from 'boardgame.io/core';

import {
  addOrUpdateThreat,
  deleteThreat,
  draw,
  pass,
  selectComponent,
  selectDiagram,
  selectThreat,
  toggleModal,
  toggleModalUpdate,
  updateThreat,
} from './moves';
import {
  endGameIf,
  endTurnIf,
  firstPlayer,
  onTurnEnd,
  setupGame,
} from './utils';

import type { Game } from 'boardgame.io';
import type { GameState } from './gameState';
import type { SetupData } from './setupData';

export const gameName = 'Elevation of Privacy';

export const ElevationOfPrivacy: Game<
  GameState,
  Record<string, unknown>,
  SetupData
> = {
  name: gameName,
  setup: setupGame,
  playerView: PlayerView.STRIP_SECRETS,
  endIf: endGameIf,

  moves: {
    draw,
    selectDiagram,
    selectComponent,
    selectThreat,
  },

  turn: {
    order: {
      ...TurnOrder.DEFAULT,
      first: firstPlayer,
    },
    endIf: endTurnIf,
    onEnd: onTurnEnd,
    stages: {
      threats: {
        moves: {
          addOrUpdateThreat,
          deleteThreat,
          pass,
          selectDiagram,
          selectComponent,
          selectThreat,
          toggleModal,
          toggleModalUpdate,
          updateThreat,
        },
      },
    },
  },
};