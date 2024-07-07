import { DEFAULT_START_SUIT, GameMode } from '@eop/shared';
import { render } from '@testing-library/react';
import React from 'react';
import { describe, it } from 'vitest';

import Deck from './deck';

describe('Deck', () => {
  it('renders without crashing', () => {
    render(
      <Deck
        suit={DEFAULT_START_SUIT}
        cards={[]}
        isInThreatStage={true}
        round={0}
        current={false}
        active={false}
        onCardSelect={() => {
          /* do nothing */
        }}
        startingCard="T3"
        gameMode={GameMode.EOP}
      />,
    );
  });

  it('renders active card correctly', () => {
    render(
      <Deck
        suit={DEFAULT_START_SUIT}
        cards={['T3', 'S2']}
        isInThreatStage={true}
        round={0}
        current={true}
        active={true}
        onCardSelect={() => {
          /* do nothing */
        }}
        startingCard="T3"
        gameMode={GameMode.EOP}
      />,
    );
  });

  // TODO: Test card renders correctly for cornucopia as well
});
