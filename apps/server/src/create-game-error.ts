import type { Issue } from '@eop/shared';

export type CreateGameErrorCode =
  | 'invalid_request'
  | 'invalid_model_json'
  | 'invalid_model'
  | 'missing_image'
  | 'unsupported_file_type'
  | 'file_type_mismatch';

/**
 * A client error (400) refused at game creation, carrying the contract's
 * `error` code and, where applicable, safe validation issues
 * (contracts/post-game-create.md).
 */
export class CreateGameError extends Error {
  readonly status = 400;
  readonly code: CreateGameErrorCode;
  readonly issues: Issue[] | undefined;

  constructor(code: CreateGameErrorCode, issues?: Issue[]) {
    super(code);
    this.name = 'CreateGameError';
    this.code = code;
    this.issues = issues;
  }
}
