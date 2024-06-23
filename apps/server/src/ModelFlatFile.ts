import { FlatFile } from 'boardgame.io/server';

import type { ThreatDragonModel } from '@eop/shared';
import type { StorageAPI } from 'boardgame.io';
import type { Object } from 'ts-toolbelt';

interface ModelFetchOpts extends StorageAPI.FetchOpts {
  model?: boolean;
}

type Model = ThreatDragonModel | { extension: string };

interface ModelFetchFields extends StorageAPI.FetchFields {
  model: Model | null;
}

type ModelFetchResult<O extends ModelFetchOpts> = Object.Pick<
  ModelFetchFields,
  Object.SelectKeys<O, true>
>;

/**
 * FlatFile data storage with support for saving a model.
 */
export class ModelFlatFile extends FlatFile {
  async fetch<O extends ModelFetchOpts>(
    matchID: string,
    opts: O,
  ): Promise<ModelFetchResult<O>> {
    const result = await super.fetch(matchID, opts);
    if (opts.model) {
      const key = this.getModelKey(matchID);
      return {
        ...result,
        // @ts-expect-error getItem is private, ask boardgame.io to make it protected
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        model: await this.getItem(key),
      } as ModelFetchResult<O>;
    }
    return result as ModelFetchResult<O>;
  }

  async setModel(id: string, model: Model | null): Promise<void> {
    const key = this.getModelKey(id);
    // @ts-expect-error setItem is private, ask boardgame.io to make it protected
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return await this.setItem(key, model);
  }

  getModelKey(matchID: string): string {
    return `${matchID}:model`;
  }
}
