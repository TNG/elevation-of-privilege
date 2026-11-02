import { describe, expect, it } from 'vitest';

import { GameMode } from '../utils/GameMode';
import { SUITS } from '../utils/cardDefinitions';
import { ModelType } from '../utils/constants';

import * as v from 'valibot';

import { createGameRequestSchema } from './create-game-request';

const validFields = {
  startSuit: 'A',
  gameMode: GameMode.EOP,
  modelType: ModelType.PRIVACY_ENHANCED,
  turnDuration: '300',
  names: ['a', 'b'],
};

const parse = (input: unknown) =>
  v.safeParse(createGameRequestSchema, input).output;

describe('createGameRequestSchema', () => {
  it('accepts a valid request and outputs the parsed fields', () => {
    const result = parse(validFields);
    expect(result.startSuit).toBe('A');
    expect(result.gameMode).toBe(GameMode.EOP);
    expect(result.modelType).toBe(ModelType.PRIVACY_ENHANCED);
    expect(result.turnDuration).toBe(300);
    expect(result.names).toStrictEqual(['a', 'b']);
    expect(result.model).toBeUndefined();
  });

  it('strips unknown form keys from the output', () => {
    const result = parse({ ...validFields, extension: 'png', evil: '<x>' });
    expect(result).not.toHaveProperty('extension');
    expect(result).not.toHaveProperty('evil');
  });

  describe('startSuit', () => {
    it('accepts every suit in SUITS', () => {
      for (const suit of SUITS) {
        expect(parse({ ...validFields, startSuit: suit }).startSuit).toBe(suit);
      }
    });

    it('refuses a suit not in the picklist', () => {
      expect(
        v.safeParse(createGameRequestSchema, { ...validFields, startSuit: 'X' })
          .success,
      ).toBe(false);
    });
  });

  describe('gameMode', () => {
    it('accepts every GameMode', () => {
      for (const mode of Object.values(GameMode)) {
        expect(
          v.safeParse(createGameRequestSchema, {
            ...validFields,
            gameMode: mode,
          }).success,
        ).toBe(true);
      }
    });

    it('refuses an unknown game mode', () => {
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          gameMode: 'Not A Mode',
        }).success,
      ).toBe(false);
    });
  });

  describe('modelType', () => {
    it('accepts every ModelType', () => {
      for (const type of Object.values(ModelType)) {
        expect(
          v.safeParse(createGameRequestSchema, {
            ...validFields,
            modelType: type,
            ...(type === ModelType.THREAT_DRAGON
              ? { model: '{"summary":{"title":"x"}}' }
              : {}),
          }).success,
        ).toBe(true);
      }
    });

    it('refuses an unknown model type', () => {
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          modelType: 'Nope',
        }).success,
      ).toBe(false);
    });
  });

  describe('modelReference', () => {
    it('is optional', () => {
      expect(v.safeParse(createGameRequestSchema, validFields).success).toBe(
        true,
      );
    });

    it('accepts an https URL', () => {
      expect(
        parse({ ...validFields, modelReference: 'https://example.com/model' })
          .modelReference,
      ).toBe('https://example.com/model');
    });

    it('refuses http, javascript and non-URL values', () => {
      for (const bad of [
        'http://example.com/model',
        'javascript:alert(1)',
        'not a url',
        'ftp://example.com/model',
      ]) {
        expect(
          v.safeParse(createGameRequestSchema, {
            ...validFields,
            modelReference: bad,
          }).success,
        ).toBe(false);
      }
    });
  });

  describe('turnDuration', () => {
    it('is a string of digits transformed into a number', () => {
      expect(parse({ ...validFields, turnDuration: '0' }).turnDuration).toBe(0);
      expect(parse({ ...validFields, turnDuration: '3600' }).turnDuration).toBe(
        3600,
      );
    });

    it('refuses out-of-range and malformed values', () => {
      for (const bad of ['3601', '-1', '1.5', 'abc', '5x', '']) {
        expect(
          v.safeParse(createGameRequestSchema, {
            ...validFields,
            turnDuration: bad,
          }).success,
        ).toBe(false);
      }
    });

    it('refuses a non-string value', () => {
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          turnDuration: 300,
        }).success,
      ).toBe(false);
    });
  });

  describe('names', () => {
    it('trims the names in the output', () => {
      expect(
        parse({ ...validFields, names: ['  a  ', 'b'] }).names,
      ).toStrictEqual(['a', 'b']);
    });

    it('accepts 2 to 9 names', () => {
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          names: ['a', 'b'],
        }).success,
      ).toBe(true);
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          names: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        }).success,
      ).toBe(true);
    });

    it('refuses 1 and 10 names', () => {
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          names: ['a'],
        }).success,
      ).toBe(false);
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          names: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        }).success,
      ).toBe(false);
    });

    it('refuses empty and whitespace-only names', () => {
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          names: ['a', '  '],
        }).success,
      ).toBe(false);
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          names: ['', 'b'],
        }).success,
      ).toBe(false);
    });

    it('refuses duplicate names after trimming', () => {
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          names: ['a', ' a '],
        }).success,
      ).toBe(false);
    });
  });

  describe('model (Threat Dragon)', () => {
    it('is required when modelType is THREAT_DRAGON', () => {
      const result = v.safeParse(createGameRequestSchema, {
        ...validFields,
        modelType: ModelType.THREAT_DRAGON,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(v.getDotPath(result.issues[0])).toBe('model');
      }
    });

    it('accepts a string model when modelType is THREAT_DRAGON', () => {
      const result = parse({
        ...validFields,
        modelType: ModelType.THREAT_DRAGON,
        model: '{"summary":{"title":"x"}}',
      });
      expect(result.model).toBe('{"summary":{"title":"x"}}');
    });

    it('does not require model for other model types', () => {
      expect(
        v.safeParse(createGameRequestSchema, {
          ...validFields,
          modelType: ModelType.IMAGE,
        }).success,
      ).toBe(true);
    });
  });
});
