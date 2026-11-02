import * as v from 'valibot';

/**
 * A validation issue reduced to what is safe to expose: the location of the
 * problem and the schema's expectation. Submitted values are never included.
 */
export interface Issue {
  path: string;
  expected: string | null;
}

/**
 * Formats valibot issues as safe `Issue` objects, using only `getDotPath` and
 * the schema-defined `expected` of each issue (never `message` or `input`).
 *
 * An optional `prefix` is prepended to every path (e.g. `model.`). Issues
 * without a path (the value itself has the wrong type, e.g. a non-object
 * model) are kept with the prefix alone; wrapper issues that merely nest
 * their subissues are flattened instead.
 */
export function formatIssues<TIssue extends v.BaseIssue<unknown>>(
  issues: readonly TIssue[],
  prefix?: string,
): Issue[] {
  const formatted: Issue[] = [];
  for (const issue of issues) {
    const path = v.getDotPath(issue);
    if (path === null) {
      if (issue.issues !== undefined && issue.issues.length > 0) {
        formatted.push(...formatIssues(issue.issues, prefix));
        continue;
      }
      formatted.push({
        path: prefix ?? '',
        expected: issue.expected ?? null,
      });
      continue;
    }
    formatted.push({
      path: prefix ? `${prefix}.${path}` : path,
      expected: issue.expected ?? null,
    });
  }
  return formatted;
}
