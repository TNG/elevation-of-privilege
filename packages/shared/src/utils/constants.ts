import type {ThreatDragonModelV2} from '../game/ThreatDragonModel';

export enum ModelType {
  THREAT_DRAGON = 'Threat Dragon',
  PRIVACY_ENHANCED = 'Default',
  IMAGE = 'Image',
}

export const DEFAULT_START_SUIT = 'E';
export const CARD_LIMIT = 26;

export const MIN_NUMBER_PLAYERS = 2;
export const MAX_NUMBER_PLAYERS = 9;
export const DEFAULT_TURN_DURATION = 300;


export const DEFAULT_MODEL: ThreatDragonModelV2 = {
  version: '2.5.0',
  summary: {
    title: 'Threat Modelling',
  },
  detail: {
    contributors: [],
    diagrams: [
      {
        id: 0,
        title: 'Threat Modelling',
        diagramType: 'STRIDE',
        thumbnail: '',
        version: '2.5.0',
        cells: [
          {
            id: '90cdcc2d-21ab-443d-ae95-f97a798429e7',
            shape: 'actor',
            zIndex: 1,
            visible: true,

            position: { x: 50, y: 50 },
            size: { width: 160, height: 80 },
            attrs: {
              text: { text: 'Application' },
              body: { stroke: '#333333', strokeWidth: 1.5, strokeDasharray: null },
            },

            data: {
              type: 'tm.Actor',
              name: 'Application',
              description: '',
              outOfScope: false,
              reasonOutOfScope: '',
              hasOpenThreats: false,
              providesAuthentication: false,
              threats: [],
            },
          },
        ],
      },
    ],
    diagramTop: 1,
    threatTop: 0,
    reviewer: '',
  },
};


export const SPECTATOR = 'spectator';
