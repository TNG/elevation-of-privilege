import { faDownload, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FC, ReactNode, useState } from 'react';
import { Button } from 'reactstrap';
import type { PlayerID } from 'boardgame.io';

type DownloadButtonProps = {
  color?: string;
  active?: boolean;
  block?: boolean;
  disabled?: boolean;
  outline?: boolean;
  size?: string;
  apiEndpoint: string;
  matchID: string;
  secret: string;
  playerID: PlayerID;
  children: ReactNode;
};

const DownloadButton: FC<DownloadButtonProps> = ({
  color: initialColor,
  matchID,
  apiEndpoint,
  playerID,
  secret,
  children,
  ...props
}) => {
  const apiBase = '/api';

  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(faDownload);

  const apiEndpointUrl = `${apiBase}/game/${matchID}/${apiEndpoint}`;

  const handleClick = async () => {
    try {
      const res = await fetch(apiEndpointUrl, {
        headers: {
          Authorization: 'Basic ' + btoa(playerID + ':' + secret),
        },
      });
      if (!res.ok) {
        throw Error(res.statusText);
      }

      const blob = await res.blob();
      const a = document.createElement('a');

      a.href = URL.createObjectURL(blob);
      a.download = getFilename(res);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setColor('danger');
      setIcon(faTimes);
      setTimeout(() => {
        setColor(initialColor);
        setIcon(faDownload);
      }, 500);
      console.error(err);
    }
  };

  return (
    <Button color={color} onClick={handleClick} {...props}>
      <FontAwesomeIcon icon={icon} fixedWidth /> &nbsp;
      {children}
    </Button>
  );
};

export default DownloadButton;

function getFilename(response: Response): string {
  const header = response.headers.get('Content-Disposition');
  return header?.match(/filename="(.*)"$/)?.[1] ?? 'untitled';
}
