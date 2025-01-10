import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import Create from '../create';
import { BrowserRouter as Router } from 'react-router-dom';

describe('Create', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders without crashing', () => {
    render(
      <Router>
        <Create />
      </Router>,
    );

    screen.getAllByRole('button', {
      name: 'Proceed',
    });
  });

  it('should render imprint link if env var is defined', () => {
    // given
    vi.stubEnv('VITE_EOP_IMPRINT', 'https://example.tld/imprint/');

    // when
    render(
      <Router>
        <Create />
      </Router>,
    );

    // when

    // then
    const links = screen.queryAllByRole('link', {
      name: `Imprint`,
    });
    expect(links.length).toBe(1);
  });

  it('should not render imprint link if env var is not defined', () => {
    // when
    render(
      <Router>
        <Create />
      </Router>,
    );

    // then
    const links = screen.queryAllByRole('link', {
      name: `Imprint`,
    });
    expect(links.length).toBe(0);
  });

  it('should render privacy link if env var is defined', () => {
    // given
    vi.stubEnv('VITE_EOP_PRIVACY', 'https://example.tld/privacy/');

    // when
    render(
      <Router>
        <Create />
      </Router>,
    );

    // when

    // then
    const links = screen.queryAllByRole('link', {
      name: `Privacy`,
    });
    expect(links.length).toBe(1);
  });

  it('should not render privacy link if env var is not defined', () => {
    // when
    render(
      <Router>
        <Create />
      </Router>,
    );

    // then
    const links = screen.queryAllByRole('link', {
      name: 'Privacy',
    });
    expect(links.length).toBe(0);
  });
});
