import { ElevationOfPrivilege, SPECTATOR } from '@eop/shared';
import { SocketIO } from 'boardgame.io/multiplayer';
import { Client } from 'boardgame.io/react';
import { useParams } from 'react-router-dom';

import '@eop/cornucopia-cards/style.css';
import '@eop/eoprivacy-cards/style.css';

import Board from '../components/board/board';

import '../styles/cards.css';
import '../styles/eop_cards.css';
import '../styles/cornucopia_cards.css';
import '../styles/eoprivacy_cards.css';
import '../styles/cumulus_cards.css';
import '../styles/eomlsec_cards.css';

import type { FC } from 'react';

const url =
  window.location.protocol +
  '//' +
  window.location.hostname +
  (window.location.port ? ':' + window.location.port : '');

const EOP = Client({
  game: ElevationOfPrivilege,
  board: Board,
  debug: false,
  multiplayer: SocketIO({
    server: `${url}`,
  }),
});

type MatchParams = {
  matchID: string;
  playerID: string;
  credentials: string;
};

const App: FC = () => {
  const { matchID, playerID, credentials } = useParams<MatchParams>();

  return (
    <div className="player-container">
      <EOP
        matchID={matchID}
        credentials={credentials}
        playerID={playerID === SPECTATOR ? undefined : playerID}
      />
    </div>
  );
};

export default App;
