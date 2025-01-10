import { BrowserRouter as Router } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Logo from './logo';

describe('logo', () => {
  it('is rendered with alt text', () => {
    render(
      <Router>
        <Logo />
      </Router>,
    );

    expect(screen.getByAltText('logo')).toBeVisible();
  });
});
