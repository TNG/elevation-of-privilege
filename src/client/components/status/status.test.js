import React from 'react';
import ReactDOM from 'react-dom';
import Status from './status';
import { DEFAULT_GAME_MODE } from '../../../utils/GameMode';

it('renders without crashing', () => {
  const G = {
    dealt: ['T1'],
    order: [0, 1, 2],
    scores: [0, 0, 0],
    gameMode: DEFAULT_GAME_MODE,
  };
  const ctx = {};
  const div = document.createElement('div');
  ReactDOM.render(
    <Status
      G={G}
      ctx={ctx}
      current={true}
      active={true}
      names={['P1', 'P2', 'P3']}
      dealtCard="T3"
    />,
    div,
  );
  ReactDOM.unmountComponentAtNode(div);
});

it('renders play phase correctly', () => {
  const G = {
    dealt: ['T1'],
    order: [0, 1, 2],
    scores: [0, 0, 0],
    round: 0,
    passed: [],
    gameMode: DEFAULT_GAME_MODE,
  };
  const ctx = {
    phase: 'play',
    currentPlayer: '0',
    numPlayers: 3,
  };
  const div = document.createElement('div');
  ReactDOM.render(
    <Status
      G={G}
      ctx={ctx}
      current={true}
      active={true}
      names={['P1', 'P2', 'P3']}
      dealtCard=""
      playerID="0"
    />,
    div,
  );
  ReactDOM.unmountComponentAtNode(div);
});

it('renders threat phase correctly', () => {
  const G = {
    dealt: ['T1'],
    order: [0, 1, 2],
    scores: [0, 0, 0],
    round: 0,
    passed: [],
    gameMode: DEFAULT_GAME_MODE,
  };
  const ctx = {
    phase: 'threats',
    currentPlayer: '0',
    numPlayers: 3,
  };
  const div = document.createElement('div');
  ReactDOM.render(
    <Status
      G={G}
      ctx={ctx}
      current={true}
      active={true}
      names={['P1', 'P2', 'P3']}
      dealtCard=""
      playerID="0"
    />,
    div,
  );
  ReactDOM.unmountComponentAtNode(div);
});

it('renders last won correctly', () => {
  const G = {
    dealt: ['T1'],
    order: [0, 1, 2],
    scores: [0, 0, 0],
    round: 10,
    passed: [],
    dealtCard: '',
    gameMode: DEFAULT_GAME_MODE,
  };
  const ctx = {
    phase: 'play',
    currentPlayer: '0',
    numPlayers: 3,
  };
  const div = document.createElement('div');
  ReactDOM.render(
    <Status
      G={G}
      ctx={ctx}
      current={true}
      active={true}
      names={['P1', 'P2', 'P3']}
      dealtCard=""
      playerID="0"
    />,
    div,
  );
  ReactDOM.unmountComponentAtNode(div);
});
