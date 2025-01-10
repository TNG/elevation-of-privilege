import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Timer from './timer';

describe('Timer', () => {
  it('renders without crashing', async () => {
    render(<Timer duration={60} targetTime={Date.now() + 60 * 1000} />);

    const element = await screen.findByTestId('timer-wrapper');

    expect(element).toBeInTheDocument();
  });

  it("doesn't render when not active", () => {
    render(
      <Timer
        active={false}
        duration={60}
        targetTime={Date.now() + 60 * 1000}
      />,
    );

    const element = screen.queryByTestId('timer-wrapper');

    expect(element).not.toBeInTheDocument();
  });

  it("doesn't render when duration is zero", () => {
    render(<Timer duration={0} targetTime={Date.now() + 60 * 1000} />);

    const element = screen.queryByTestId('timer-wrapper');

    expect(element).not.toBeInTheDocument();
  });
});
