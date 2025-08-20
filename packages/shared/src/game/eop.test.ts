import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { beforeEach, describe, expect, it } from 'vitest';

import { getStartingCard } from '../utils/cardDefinitions';
import { DEFAULT_START_SUIT } from '../utils/constants';
import { DEFAULT_GAME_MODE } from '../utils/GameMode';
import { ElevationOfPrivilege } from './eop';
import { GameState } from './gameState';

describe('game', () => {
  let players: Record<'0' | '1' | '2', ReturnType<typeof Client<GameState>>>;
  let startingPlayer: keyof typeof players;
  let matchID = 0;

  beforeEach(() => {
    const spec = {
      game: ElevationOfPrivilege,
      numPlayers: 3,
      multiplayer: Local(),
      matchID: (matchID++).toString(),
    };
    players = {
      '0': Client({ ...spec, playerID: '0' }),
      '1': Client({ ...spec, playerID: '1' }),
      '2': Client({ ...spec, playerID: '2' }),
    };
    Object.values(players).forEach((p) => p.start());
    startingPlayer = players['0'].getState()!.ctx
      .currentPlayer as keyof typeof players;
  });

  const STARTING_CARD = getStartingCard(DEFAULT_GAME_MODE, DEFAULT_START_SUIT);

  it("shouldn't start in a stage/phase", () => {
    expect(players['0'].getState()?.ctx.activePlayers).toBe(null);
    expect(players['0'].getState()?.ctx.phase).toBe(null);
  });

  it('should start with scores set to zero', () => {
    expect(players['0'].getState()?.G.scores).toStrictEqual([0, 0, 0]);
  });

  it('have correct order in ctx', () => {
    const state = players['0'].getState();
    expect(state?.ctx.playOrder).toStrictEqual(['0', '1', '2']);
  });

  it('should move to the threats stage when the first player makes a move', () => {
    // when
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    // then
    const state = players['0'].getState();
    expect(state?.G.dealt).toContain(STARTING_CARD);
    expect(state?.G.dealtBy).toBe(startingPlayer);
    expect(state?.G.suit).toBe(STARTING_CARD.slice(0, 1));
    expect(players['0'].getState()?.ctx.activePlayers).toStrictEqual({
      '0': 'threats',
      '1': 'threats',
      '2': 'threats',
    });
  });

  it('the played card should not be present in the deck', () => {
    // when
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    // then
    const cards = players[startingPlayer].getState()?.G.players[startingPlayer];
    expect(cards?.includes(STARTING_CARD)).toBe(false);
  });

  it('player should not be able to draw again', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    const cards = players[startingPlayer].getState()!.G.players[startingPlayer];
    const card = cards?.[Math.floor(Math.random() * cards.length)];

    // when
    players[startingPlayer].moves.draw?.(card);

    // then
    const state = players['0'].getState();
    expect(state?.G.dealt.includes(card!)).toBe(false);
  });

  it('anyone should be able to select diagrams in a threats stage', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    Object.values(players).forEach((p, i) => {
      // when
      p.moves.selectDiagram?.(i);

      // then
      const state = players['0'].getState();
      expect(state?.G.selectedDiagram).toBe(i);
    });
  });

  it('anyone should be able to select components in a threats stage', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    Object.values(players).forEach((p, i) => {
      // when
      p.moves.selectComponent?.(`${i}`);

      // then
      const state = players['0'].getState();
      expect(state?.G.selectedComponent).toBe(`${i}`);
    });
  });

  it('anyone should be able to select threats in a threats stage', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    Object.values(players).forEach((p, i) => {
      // when
      p.moves.selectThreat?.(`${i}`);

      // then
      const state = players['0'].getState();
      expect(state?.G.selectedThreat).toBe(`${i}`);
    });
  });

  it('anyone should be able to toggle the threat add modal in a threats stage', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    Object.values(players).forEach((p) => {
      // when
      p.moves.toggleModal?.();

      // then
      const state = players['0'].getState();
      expect(state?.G.threat.modal).toBe(true);
      expect(state?.G.threat.owner).toBe(p.playerID);

      // when
      // only the owner should be able to toggle the modal again
      p.moves.toggleModal?.();

      // then
      const state2 = players['0'].getState();
      expect(state2?.G.threat.modal).toBe(false);
    });
  });

  it('the players who pass in the threats stage should not be able to toggle the modal', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);
    players['0'].moves.pass?.();

    // when
    players['0'].moves.toggleModal?.();

    // then
    const state = players['0'].getState();
    expect(state?.G.threat.modal).toBe(false);
  });

  it('the players who have passed should not be able to select a diagram', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);
    players['0'].moves.pass?.();

    // when
    players['0'].moves.selectDiagram?.('foo');

    // then
    const state = players['0'].getState();
    expect(state?.G.selectedDiagram).not.toBe('foo');
  });

  it('the players who have passed should not be able to select a component', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);
    players['0'].moves.pass?.();

    // when
    players['0'].moves.selectComponent?.('foo');

    // then
    const state = players['0'].getState();
    expect(state?.G.selectedComponent).not.toBe('foo');
  });

  it('the players who have passed should not be able to select a threat', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);
    players['0'].moves.pass?.();

    // when
    players['0'].moves.selectThreat?.('foo');

    // then
    const state = players['0'].getState();
    expect(state?.G.selectedThreat).not.toBe('foo');
  });

  it('the players who have not passed should be able to add a threat', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);
    players['0'].moves.pass?.();

    // when
    players['1'].moves.toggleModal?.();

    const stateBeforeUpdating = players['0'].getState();
    const diagram = stateBeforeUpdating?.G.selectedDiagram;
    const component = stateBeforeUpdating?.G.selectedComponent;
    const createdThreat = stateBeforeUpdating?.G.threat.id;

    players['1'].moves.updateThreat?.('title', 'foo');
    players['1'].moves.updateThreat?.('description', 'bar');
    players['1'].moves.updateThreat?.('mitigation', 'baz');
    players['1'].moves.addOrUpdateThreat?.();

    // then
    const stateAfterUpdating = players['0'].getState();
    const t =
      stateAfterUpdating!.G.identifiedThreats[diagram!]![component!]![
        createdThreat!
      ];
    expect(t?.id).toBe(createdThreat);
    expect(t?.owner).toBe('1');
    expect(t?.title).toBe('foo');
    expect(t?.description).toBe('bar');
    expect(t?.mitigation).toBe('baz');
  });

  it('the players who have not passed and are owners of a created threat should be able to toggle modal update', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);
    players['0'].moves.pass?.();
    players['1'].moves.toggleModal?.();
    players['1'].moves.updateThreat?.('title', 'foo');
    players['1'].moves.updateThreat?.('description', 'bar');
    players['1'].moves.updateThreat?.('mitigation', 'baz');
    players['1'].moves.addOrUpdateThreat?.();

    // when
    players['1'].moves.toggleModalUpdate?.({
      owner: '1',
      title: 'foo',
      description: 'bar',
      mitigation: 'baz',
    });
    const state = players['0'].getState();
    expect(state?.G.threat.new).toBe(false);
    players['1'].moves.toggleModal?.();
  });

  it('the threat owners should be able to delete threats', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);
    players['0'].moves.pass?.();
    players['1'].moves.toggleModal?.();
    players['1'].moves.updateThreat?.('title', 'foo');
    players['1'].moves.updateThreat?.('description', 'bar');
    players['1'].moves.updateThreat?.('mitigation', 'baz');
    players['1'].moves.addOrUpdateThreat?.();
    const createdThreat = players['0'].getState()?.G.threat.id;

    // when
    players['1'].moves.deleteThreat?.({
      owner: '1',
      id: createdThreat,
    });

    // then
    const state = players['0'].getState();
    const diagram = state?.G.selectedDiagram;
    const component = state?.G.selectedComponent;

    expect(state!.G.identifiedThreats[diagram!]![component!]).toStrictEqual({});
  });

  it('should move on when all players have passed', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    // when
    Object.values(players).forEach((p) => p.moves.pass?.());

    // then
    expect(players['0'].getState()?.ctx.activePlayers).toBe(null);
  });

  it('should respect the play order', () => {
    // given
    players[startingPlayer].moves.draw?.(STARTING_CARD);

    // when
    Object.values(players).forEach((p) => p.moves.pass?.());

    // then
    const state = players['0'].getState()!;
    const nextPlayer = (parseInt(startingPlayer) + 1) % state.ctx.numPlayers;
    expect(state.ctx.currentPlayer).toBe(nextPlayer.toString());
  });
});
