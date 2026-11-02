import { GameMode } from '../utils/GameMode';
import { SUITS } from '../utils/cardDefinitions';
import {
  MAX_NUMBER_PLAYERS,
  MIN_NUMBER_PLAYERS,
  ModelType,
} from '../utils/constants';

import * as v from 'valibot';

/**
 * Rules for the `POST /game/create` form fields (data-model §1).
 *
 * The envelope is a stripping `v.object`: unknown form keys are dropped from
 * the output instead of being stored.
 */
export const createGameRequestSchema = v.pipe(
  v.object({
    startSuit: v.picklist(SUITS),
    gameMode: v.enum(GameMode),
    modelType: v.enum(ModelType),
    modelReference: v.optional(
      v.pipe(
        v.string(),
        v.url(),
        v.check((value) => {
          try {
            return new URL(value).protocol === 'https:';
          } catch {
            return false;
          }
        }, 'https required'),
      ),
    ),
    turnDuration: v.pipe(
      v.string(),
      v.regex(/^\d{1,4}$/),
      v.transform(Number),
      v.integer(),
      v.minValue(0),
      v.maxValue(3600),
    ),
    names: v.pipe(
      v.array(v.pipe(v.string(), v.trim(), v.nonEmpty())),
      v.minLength(MIN_NUMBER_PLAYERS),
      v.maxLength(MAX_NUMBER_PLAYERS),
      v.check(
        (names) => new Set(names).size === names.length,
        'names must be unique',
      ),
    ),
    model: v.optional(v.string()),
  }),
  v.forward(
    v.partialCheck(
      [['modelType'], ['model']],
      (input) =>
        input.modelType !== ModelType.THREAT_DRAGON ||
        input.model !== undefined,
    ),
    ['model'],
  ),
);

export type CreateGameRequest = v.InferOutput<typeof createGameRequestSchema>;
