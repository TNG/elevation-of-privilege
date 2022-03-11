import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import * as utils from '../../utils/utils';
import CopyButton from './copybutton';


describe('CopyButton', () => {
  it('renders the button with icon and a caption', () => {
    render(<CopyButton textToCopy={'Some sample text'}>Test Caption</CopyButton>);

    screen.getByText('Test Caption');
  });

  it('renders the button with icon and a caption nested in another element', () => {
    render(<CopyButton textToCopy={'Some sample text'}><span>Another Test Caption</span></CopyButton>);

    screen.getByText('Another Test Caption');
  });

  it('copies the configured text to the clipboard when clicked', async () => {
    const expectedTextToCopy = 'Some sample text';
    const copyToClipboardSpy = jest.spyOn(utils, 'copyToClipboard');

    render(<CopyButton textToCopy={expectedTextToCopy}>Test Caption</CopyButton>);

    await act(async () => {
      fireEvent.click(screen.getByText('Test Caption'));
    });

    expect(copyToClipboardSpy).toHaveBeenCalledWith(expectedTextToCopy);
  });
});
