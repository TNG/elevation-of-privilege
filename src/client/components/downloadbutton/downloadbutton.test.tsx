import { render, screen } from '@testing-library/react';
import React from 'react';
import DownloadButton from './downloadbutton';

describe('DownloadButton', () => {
  it('renders the button with icon and a caption', () => {
    render(<DownloadButton apiEndpoint="download" playerID={"0"} matchID="1234">Test Caption</DownloadButton>);

    screen.getByText('Test Caption');
  });

  it('renders the button with icon and a caption nested in another element', () => {
    render(<DownloadButton apiEndpoint="download" playerID={"0"} matchID="1234"><span>Another Test Caption</span></DownloadButton>);

    screen.getByText('Another Test Caption');
  });

  it('when clicked fetches data  the configured text to the clipboard when clicked', async () => {
    // TODO write reasonable test
    // fetchMock.doMock();
    //
    // const copyToClipboardSpy = jest.spyOn(utils, 'copyToClipboard');
    //
    // render(<DownloadButton apiEndpoint="download" playerID={"0"} matchID="1234">Test Caption</DownloadButton>);
    //
    // await act(async () => {
    //   fireEvent.click(screen.getByText('Test Caption'));
    // });
    //
    // expect(copyToClipboardSpy).toHaveBeenCalledWith(expectedTextToCopy);
  });
});
