import { ModelFlatFile } from './ModelFlatFile';
import { getDbFolder } from './filesystem';

export function getDatabase(): ModelFlatFile {
  return new ModelFlatFile({
    dir: getDbFolder(),
    logging: false,
  });
}

export const SERVER_PORT = Number.parseInt(process.env.SERVER_PORT ?? '8000');
export const API_PORT = Number.parseInt(process.env.API_PORT ?? '8001');
export const INTERNAL_API_PORT = Number.parseInt(
  process.env.INTERNAL_API_PORT ?? '8002',
);
