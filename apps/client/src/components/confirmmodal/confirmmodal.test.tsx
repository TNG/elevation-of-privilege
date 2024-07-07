import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import ConfirmModal from './confirmmodal';

describe('confirm', () => {
  it('shows header, body and buttons when rendered open', () => {
    // when
    render(<ConfirmModal onClose={() => {}} isOpen={true} />);

    const header = screen.getByText('Warning!');
    const body = screen.getByText('Are you sure?');
    const okButton = screen.getByText('Ok');
    const cancelButton = screen.getByText('Cancel');

    expect(header).toBeVisible();
    expect(body).toBeVisible();
    expect(okButton).toBeVisible();
    expect(cancelButton).toBeVisible();
  });

  it('does not show header, body and buttons when rendered closed', () => {
    // when
    render(<ConfirmModal onClose={() => {}} isOpen={false} />);

    const header = screen.queryByText('Warning!');
    const body = screen.queryByText('Are you sure?');
    const okButton = screen.queryByText('Ok');
    const cancelButton = screen.queryByText('Cancel');

    expect(header).not.toBeInTheDocument();
    expect(body).not.toBeInTheDocument();
    expect(okButton).not.toBeInTheDocument();
    expect(cancelButton).not.toBeInTheDocument();
  });

  it("calls onClose with 'true' when the user clicks on the Ok button", async () => {
    // given
    const onClose = vi.fn();

    render(<ConfirmModal onClose={onClose} isOpen={true} />);

    // when
    const button = screen.getByText('Ok');
    await userEvent.click(button);

    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("calls onClose with 'false' when the user clicks on the Cancel button", async () => {
    // given
    const onClose = vi.fn();

    render(<ConfirmModal onClose={onClose} isOpen={true} />);

    // when
    const button = screen.getByText('Cancel');
    await userEvent.click(button);

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("calls onClose with 'false' when the user clicks on the close button", async () => {
    // given
    const onClose = vi.fn();

    render(<ConfirmModal onClose={onClose} isOpen={true} />);

    // when
    const button = screen.getByLabelText('Close');
    await userEvent.click(button);

    expect(onClose).toHaveBeenCalledWith(false);
  });
});
