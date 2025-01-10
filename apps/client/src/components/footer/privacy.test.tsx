import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import Privacy from './privacy';

describe('Privacy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should render link if env var is defined', async () => {
    // given
    vi.stubEnv('VITE_EOP_PRIVACY', 'https://example.tld/privacy/');
    render(<Privacy />);

    // when
    const link = await screen.findByRole('link');

    // then
    expect(link).toBeInTheDocument();
  });

  it('should not render link if env var is not defined', () => {
    // given
    render(<Privacy />);

    // when
    const link = screen.queryByRole('link');

    // then
    expect(link).not.toBeInTheDocument();
  });
});
