import { DEFAULT_GAME_MODE } from '@eop/shared';
import { render } from '@testing-library/react';
import React from 'react';
import { describe, it } from 'vitest';

import DealtCard from './dealtcard';

describe('DealtCard', () => {
  it('renders without crashing', () => {
    render(<DealtCard card="T3" gameMode={DEFAULT_GAME_MODE} />);
  });
});
