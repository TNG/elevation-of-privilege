import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import PrivacyEnhancedModel from './privacyEnhancedModel';

describe('privacy enhanced model', () => {
  it('should provide link to model', () => {
    const linkToModel = 'https://link/to/model';

    render(<PrivacyEnhancedModel modelReference={linkToModel} />);

    expect(screen.getByText(linkToModel)).toBeVisible();
    expect(screen.getByRole('link')).toBeVisible();
  });

  it('should not provide link to model if there is no modelReference', () => {
    render(<PrivacyEnhancedModel modelReference={undefined} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
