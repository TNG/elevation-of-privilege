import { render, screen } from '@testing-library/react';
import { GameMode } from '../../../utils/GameMode';
import React from 'react';
import Threatbar from './threatbar';
import type { GameState } from '../../../game/gameState';
import type { Ctx } from 'boardgame.io';
import { ModelType } from '../../../utils/constants';

describe('<Threatbar>', () => {
  const G: GameState = {
    gameMode: GameMode.EOP,
    threat: {
      modal: false,
      new: false,
    },
    selectedDiagram: 0,
    selectedComponent: 'component1',
    identifiedThreats: {
      diagram1: {
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
    },
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
    const model = {
      detail: {
        diagrams: {
          diagram1: {
            diagramJson: {
              cells: [
                {
                  id: 'component1',
                  type: 'type',
                  attrs: {
                    text: {
                      text: 'text',
                    },
                  },
                  threats: [
                    {
                      title: 'Existing Threat 1',
                    },
                    {
                      title: 'Existing Threat 2',
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    };

    render(
      <Threatbar
        G={G}
        ctx={{} as Ctx}
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
    const model = {
      detail: {
        diagrams: {
          diagram1: {
            diagramJson: {
              cells: [
                {
                  id: 'component1',
                  type: 'type',
                  attrs: {
                    text: {
                      text: 'text',
                    },
                  },
                  threats: [
                    {
                      title: 'Existing Threat 1',
                    },
                    {
                      title: 'Existing Threat 2',
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    };

    render(
      <Threatbar
        G={G}
        ctx={{} as Ctx}
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
