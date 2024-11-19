import { GameMode, getCardCssClass } from '@eop/shared';
import type React from 'react';

import type { Card } from '@eop/shared';

interface DealtCardProps {
  gameMode: GameMode;
  card: Card;
  isAlignedRight?: boolean;
}

const DealtCard: React.FC<DealtCardProps> = ({
  gameMode,
  card,
  isAlignedRight = false,
}) => {
  const roundedClass =
    gameMode === GameMode.CUMULUS ? `card-rounded-cumulus` : `card-rounded`;
  return (
    <div
      className={`playing-card ${getCardCssClass(
        gameMode,
        card,
      )} active ${roundedClass} scaled-big ${isAlignedRight ? `aligned-right` : ``} `}
    />
  );
};

export default DealtCard;
