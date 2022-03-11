import { faDownload, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { PlayerID } from 'boardgame.io';
import React, { useState } from 'react';
import { Button } from 'reactstrap';
import { API_PORT } from '../../../utils/constants';

interface DownloadButtonProps {
  color?: string;
  active?: boolean;
  block?: boolean;
  disabled?: boolean;
  outline?: boolean;
  size?: string;
  apiEndpoint: string;
  matchID: string;
  secret?: string;
  playerID: PlayerID;
  children: JSX.Element | string;
}

type ButtonState = 'ready' | 'failed';

const DownloadButton: React.FC<DownloadButtonProps> = (props: DownloadButtonProps) => {
  const apiBase = process.env.NODE_ENV === 'production' ? '/api' : `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  const apiEndpointUrl = `${apiBase}/game/${props.matchID}/${props.apiEndpoint}`;

  const [buttonState, setButtonState] = useState<ButtonState>('ready');
  const renderConfig = toRenderConfig(buttonState);

  const handleClick = async () => {
    try {
      const response = await fetch(apiEndpointUrl, { headers: authHeaderFrom(props.playerID, props.secret ?? '') });
      if (!response.ok) {
        throw Error(response.statusText);
      }

      const blob = await response.blob();
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = extractFilename(response.headers.get('Content-Disposition'));
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setButtonState('failed');
      setTimeout(() => setButtonState('ready'), 500);
      console.error(err);
    }
  };

  return (
    <Button
      color={renderConfig.color ?? props.color}
      onClick={handleClick}
      active={props.active}
      block={props.block}
      disabled={props.disabled}
      size={props.size}
    >
      <FontAwesomeIcon icon={renderConfig.icon} fixedWidth/> &nbsp;
      {props.children}
    </Button>
  );
};

export default DownloadButton;

function toRenderConfig(state: ButtonState) {
  switch (state) {
    case 'failed':
      return { icon: faXmark, color: 'danger' };
    case 'ready':
      return { icon: faDownload };
  }
}

function authHeaderFrom(user: PlayerID, passphrase: string) {
  return { Authorization: 'Basic ' + Buffer.from(`${user}:${passphrase}`).toString('base64') };
}

function extractFilename(header: string | null) {
  return header?.match(/filename="(.*)"$/)?.[1] ?? 'untitled';
}
