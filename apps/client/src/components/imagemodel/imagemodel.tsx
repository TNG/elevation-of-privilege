import { FC, useCallback, useEffect, useState } from 'react';
import './imagemodel.css';
import { MapInteractionCSS } from 'react-map-interaction';
import { asyncSetTimeout } from '@eop/shared';
import type { PlayerID } from 'boardgame.io';

type ImageModelProps = {
  playerID: PlayerID;
  credentials: string;
  matchID: string;
};

const apiBase = '/api';

const ImageModel: FC<ImageModelProps> = ({
  playerID,
  credentials,
  matchID,
}) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);

  const updateImage = useCallback(async () => {
    const res = await fetch(`${apiBase}/game/${matchID}/image`, {
      headers: {
        Authorization: 'Basic ' + btoa(playerID + ':' + credentials),
      },
    });
    if (!res.ok) {
      throw Error(res.statusText);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    setImgSrc(url);
  }, [playerID, credentials, matchID, setImgSrc]);

  const onError = async () => {
    // Try again
    try {
      await asyncSetTimeout(updateImage, 5000);
    } catch {
      // If updateImage fails, it won't then call this again
      // Handle this here.
      await onError();
    }
  };

  useEffect(() => {
    updateImage().catch((err) => console.error(err, (err as Error).stack));
  }, [updateImage]);

  return (
    <div className="model">
      {imgSrc && (
        <MapInteractionCSS>
          <img src={imgSrc} alt="Architectural Model" onError={onError} />
        </MapInteractionCSS>
      )}
    </div>
  );
};

export default ImageModel;
