import { render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { describe, it } from 'vitest';

import About from '../about';

describe('About', () => {
  it('renders without crashing', () => {
    render(<About />, { wrapper: Router });
  });
});
