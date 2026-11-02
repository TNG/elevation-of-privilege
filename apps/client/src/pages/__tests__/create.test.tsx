import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows the error code and issue paths and re-enables submit when creation is refused', async () => {
    // given
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: 'invalid_model',
          issues: [
            {
              path: 'model.detail.diagrams.0.diagramJson.cells.1.foo',
              expected: 'never',
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // when
    render(
      <Router>
        <Create />
      </Router>,
    );

    // no file is needed in privacy-enhanced mode
    await user.click(
      screen.getByRole('radio', {
        name: /Privacy enhanced mode/i,
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Proceed',
      }),
    );

    // then
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('invalid_model');
    expect(alert).toHaveTextContent(
      'model.detail.diagrams.0.diagramJson.cells.1.foo',
    );
    expect(
      screen.getByRole('button', {
        name: 'Proceed',
      }),
    ).toBeEnabled();
    expect(screen.queryByText('Copy All')).toBeNull();
  });

  it('shows a generic message and re-enables submit when the server fails', async () => {
    // given
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('empty body')),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // when
    render(
      <Router>
        <Create />
      </Router>,
    );

    await user.click(
      screen.getByRole('radio', {
        name: /Privacy enhanced mode/i,
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Proceed',
      }),
    );

    // then
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Game could not be created');
    expect(
      screen.getByRole('button', {
        name: 'Proceed',
      }),
    ).toBeEnabled();
    expect(screen.queryByText('Copy All')).toBeNull();
  });
});
