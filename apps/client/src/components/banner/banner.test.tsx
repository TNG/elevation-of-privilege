import { render, screen } from '@testing-library/react';
import { vi, describe, it, afterEach, expect } from 'vitest';

import Banner from './banner';

describe('Banner', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should render link if env var is defined', async () => {
    // given
    vi.stubEnv('VITE_EOP_BANNER_TEXT', 'This is a banner text');
    render(<Banner />);

    // when
    const banner = await screen.findByText('This is a banner text');

    // then
    expect(banner).toBeInTheDocument();
  });

  it('should not render link if env var is not defined', () => {
    // given
    render(<Banner />);

    // when
    const banner = screen.queryByText('This is a banner text');

    // then
    expect(banner).not.toBeInTheDocument();
  });
});
