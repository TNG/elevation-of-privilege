import {GameMode, ModelType, ThreatDragonModelV2} from '@eop/shared';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Threatbar from './threatbar';

import type { GameState } from '@eop/shared';

describe('<Threatbar>', () => {
  const selectedDiagram = 0;
  const G: GameState = {
    gameMode: GameMode.EOP,
    threat: {
      modal: false,
      new: false,
    },
    selectedDiagram,
    selectedComponent: 'component1',
    identifiedThreats: [
      {
        component1: {
          threat1: {
            title: 'Identified Threat 1',
            modal: false,
            new: false,
          },
          threat2: {
            title: 'Identified Threat 2',
            modal: false,
            new: false,
          },
        },
      },
    ],
    dealt: [],
    passed: [],
    suit: undefined,
    dealtBy: '',
    players: [],
    round: 0,
    numCardsPlayed: 0,
    scores: [],
    lastWinner: 0,
    maxRounds: 0,
    selectedThreat: '',
    startingCard: '',
    turnDuration: 0,
    modelType: ModelType.IMAGE,
  };

  it('shows identified threats in reverse order', () => {

    const model: ThreatDragonModelV2 = {
      version: '2.5.0',
      summary: {
        title: 'title',
      },
      detail: {
        contributors: [],
        diagrams: [
          {
            id: 0,
            title: '',
            diagramType: 'STRIDE',
            thumbnail: '',
            version: '2.5.0',
            cells: [
              {
                id: 'component1',
                shape: 'actor',
                zIndex: 0,
                position: { x: 0, y: 0 },
                size: { width: 0, height: 0 },
                angle: 0,
                attrs: {
                  text: {
                    text: 'text',
                  },
                },
                data: {
                  type: 'tm.Actor',
                  name: 'text',            // aus attrs.text.text übernommen (du hattest keinen separaten Namen)
                  hasOpenThreats: true,
                  threats: [
                    {
                      title: 'Existing Threat 1',
                      status: 'Open',
                      description: '',
                      mitigation: '',
                      severity: '',
                      type: '',
                    },
                    {
                      title: 'Existing Threat 2',
                      status: 'Open',
                      description: '',
                      mitigation: '',
                      severity: '',
                      type: '',
                    },
                  ],
                },
              },
            ],
          },
        ],
        diagramTop: 1,
        reviewer: '',
        threatTop: 2,
      },
    };

    render(
      <Threatbar
        G={G}
        moves={{}}
        active
        names={[]}
        model={model}
        isInThreatStage={false}
        playerID={null}
      />,
    );

    const threats = screen.getAllByText(/^Identified Threat \d+$/);
    expect(threats).toHaveLength(2);
    expect(threats[0]).toHaveTextContent('Identified Threat 2');
    expect(threats[1]).toHaveTextContent('Identified Threat 1');
  });

  it('shows existing threats in reverse order', () => {

    const model: ThreatDragonModelV2 = {
      version: '2.5.0',
      summary: {
        title: 'title',
      },
      detail: {
        contributors: [],
        reviewer: '',
        diagramTop: 1,
        threatTop: 2,
        diagrams: [
          {
            id: 0,
            title: '',
            diagramType: 'STRIDE',
            thumbnail: '',
            version: '2.5.0',
            cells: [
              {
                id: 'component1',
                shape: 'actor',             // aus type: "tm.Actor"
                zIndex: 0,                  // aus z: 0
                angle: 0,
                position: { x: 0, y: 0 },
                size: { width: 0, height: 0 },
                attrs: {
                  text: {
                    text: 'text',
                  },
                },
                data: {
                  type: 'tm.Actor',
                  name: 'text',              // aus attrs.text.text übernommen
                  hasOpenThreats: true,
                  threats: [
                    {
                      title: 'Existing Threat 1',
                      status: 'Open',
                      description: '',
                      mitigation: '',
                      severity: '',
                      type: '',
                    },
                    {
                      title: 'Existing Threat 2',
                      status: 'Open',
                      description: '',
                      mitigation: '',
                      severity: '',
                      type: '',
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };


    render(
      <Threatbar
        G={G}
        moves={{}}
        active
        names={[]}
        model={model}
        isInThreatStage={false}
        playerID={null}
      />,
    );

    const threats = screen.getAllByText(/^Existing Threat \d+$/);
    expect(threats).toHaveLength(2);
    expect(threats[0]).toHaveTextContent('Existing Threat 2');
    expect(threats[1]).toHaveTextContent('Existing Threat 1');
  });
});
