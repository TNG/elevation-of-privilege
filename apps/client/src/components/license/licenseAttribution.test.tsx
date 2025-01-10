import { GameMode } from '@eop/shared';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import LicenseAttribution from './licenseAttribution';

describe('licence attribution', () => {
  it('gives the correct license for EoP', () => {
    render(<LicenseAttribution gameMode={GameMode.EOP} />);

    expect(screen.getByText('CC-BY-3.0')).toBeVisible();
  });

  it('gives the correct license for Cornucopia', () => {
    render(<LicenseAttribution gameMode={GameMode.CORNUCOPIA} />);

    expect(screen.getByText('CC-BY-SA-3.0')).toBeVisible();
  });

  it('gives the correct license for Cumulus', () => {
    render(<LicenseAttribution gameMode={GameMode.CUMULUS} />);

    expect(screen.getByText('CC-BY-4.0')).toBeVisible();
  });

  it('gives the correct license for Elevation of MLSec', () => {
    render(<LicenseAttribution gameMode={GameMode.EOMLSEC} />);

    expect(screen.getByText('CC BY-SA 4.0 DEED')).toBeVisible();
  });
});
