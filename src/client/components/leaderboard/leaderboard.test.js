import React from 'react';
import ReactDOM from 'react-dom';
import Leaderboard from './leaderboard';
import { DEFAULT_GAME_MODE } from '../../../utils/GameMode';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(
    <Leaderboard
      scores={[0, 0, 0]}
      names={['P1', 'P2', 'P3']}
      cards={['T3', 'T4', 'T5']}
      playerID="0"
      passedUsers={[]}
      gameMode={DEFAULT_GAME_MODE}
    />,
    div,
  );
  ReactDOM.unmountComponentAtNode(div);
});
