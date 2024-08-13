import type { ThreatDragonModel } from '../game/ThreatDragonModel';
import type { ThreatDragonModel2 } from '../game/ThreatDragonModel2';

export enum ModelType {
  THREAT_DRAGON_V2 = 'Threat DragonV2',
  THREAT_DRAGON = 'Threat Dragon',
  PRIVACY_ENHANCED = 'Default',
  IMAGE = 'Image',
}

export const DEFAULT_START_SUIT = 'E';
export const CARD_LIMIT = 26;

export const MIN_NUMBER_PLAYERS = 2;
export const MAX_NUMBER_PLAYERS = 9;
export const DEFAULT_TURN_DURATION = 300;

export const TM2 : ThreatDragonModel2 = {
  summary: {
    title: 'Threat Modelling',
    owner: 'Owner',
    description: 'Description',
    id: 0,
  },
  detail: {
    contributors: [],
    diagrams: [
      {
        title: 'Threat Modelling',
        thumbnail: '',
      
        id: 0,
        cells: [
          {
            shape: 'Actor',
            zIndex: 1,
            id: '90cdcc2d-21ab-443d-ae95-f97a798429e7',
            data: {
              name: 'Application',
              description: '',
              type: 'tm.Actor',
              isTrustBoundary: false,
              hasOpenThreats: false,
            },
            position: {
              x: 50,
              y: 50,
            },
          },
        ],
        version: '1',
      },
    ],
    reviewer: 'Reviewer',
    diagramTop: 0,
    threatTop: 0,
  },
  version: '1',
};   


export const DEFAULT_MODEL: ThreatDragonModel = {
  summary: {
    title: 'Threat Modelling',
  },
  detail: {
    contributors: [],
    diagrams: [
      {
        title: 'Threat Modelling',
        thumbnail: '',
        diagramType: 'STRIDE',
        id: 0,
        diagramJson: {
          cells: [
            {
              type: 'tm.Actor',
              size: {
                width: 160,
                height: 80,
              },
              position: {
                x: 50,
                y: 50,
              },
              angle: 0,
              id: '90cdcc2d-21ab-443d-ae95-f97a798429e7',
              z: 1,
              hasOpenThreats: false,
              attrs: {
                '.element-shape': {
                  class: 'element-shape hasNoOpenThreats isInScope',
                },
                text: {
                  text: 'Application',
                },
                '.element-text': {
                  class: 'element-text hasNoOpenThreats isInScope',
                },
              },
            },
          ],
        },
        size: {
          height: 590,
          width: 790,
        },
      },
    ],
  },
};

export const SPECTATOR = 'spectator';
