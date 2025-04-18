import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Footer from './footer';

describe('Footer', () => {
  it('renders without crashing', async () => {
    // given
    render(<Footer />);

    // when
    const links = await screen.findAllByRole('link', {
      name: 'TNG Technology Consulting',
    });

    // then
    expect(links.length).toBe(2);
  });
});
