import { describe, expect, it } from 'vitest';

import * as v from 'valibot';

import { formatIssues } from './format-issues';

describe('formatIssues', () => {
  const strictSchema = v.strictObject({
    known: v.string(),
    nested: v.strictObject({
      value: v.number(),
    }),
    list: v.array(v.string()),
  });

  const submitted = {
    known: 'KNOWN-VALUE',
    unknownKey: 'UNKNOWN-SECRET-VALUE',
    nested: { value: 'NOT-A-NUMBER-SECRET' },
    list: ['ok', 42],
  };

  it('returns path and expected only, for unknown keys and wrong types', () => {
    const result = v.safeParse(strictSchema, submitted);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = formatIssues(result.issues);
      expect(issues).toStrictEqual([
        { path: 'nested.value', expected: 'number' },
        { path: 'list.1', expected: 'string' },
        { path: 'unknownKey', expected: 'never' },
      ]);
    }
  });

  it('never includes the submitted value in any output string', () => {
    const result = v.safeParse(strictSchema, submitted);
    expect(result.success).toBe(false);
    if (!result.success) {
      const output = JSON.stringify(formatIssues(result.issues));
      expect(output).not.toContain('UNKNOWN-SECRET-VALUE');
      expect(output).not.toContain('NOT-A-NUMBER-SECRET');
      expect(output).not.toContain('KNOWN-VALUE');
    }
  });

  it('builds paths with valibot getDotPath (key names and indices only)', () => {
    const result = v.safeParse(strictSchema, submitted);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = formatIssues(result.issues);
      expect(issues.map((issue) => issue.path)).toStrictEqual(
        result.issues.map((issue) => v.getDotPath(issue)),
      );
    }
  });

  it('prepends an optional prefix to every path', () => {
    const result = v.safeParse(strictSchema, {
      known: 'a',
      nested: { value: 1 },
      list: ['ok'],
      extra: 'boom',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatIssues(result.issues, 'model')).toStrictEqual([
        { path: 'model.extra', expected: 'never' },
      ]);
    }
  });

  it('keeps expected as the schema expectation when available', () => {
    const wrongType = v.safeParse(v.object({ a: v.string() }), { a: 42 });
    expect(wrongType.success).toBe(false);
    if (!wrongType.success) {
      expect(formatIssues(wrongType.issues)[0]?.expected).toBe('string');
    }

    const unknownKey = v.safeParse(v.strictObject({ a: v.string() }), {
      a: 'b',
      z: 1,
    });
    expect(unknownKey.success).toBe(false);
    if (!unknownKey.success) {
      expect(formatIssues(unknownKey.issues)[0]?.expected).toBe('never');
    }
  });

  it('keeps pathless issues with the prefix alone, e.g. a non-object model', () => {
    const result = v.safeParse(v.object({ a: v.string() }), 42);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatIssues(result.issues, 'model')).toStrictEqual([
        { path: 'model', expected: 'Object' },
      ]);
      expect(formatIssues(result.issues)).toStrictEqual([
        { path: '', expected: 'Object' },
      ]);
    }
  });

  it('reports each missing key of an empty request with its own path', () => {
    const piped = v.pipe(
      v.object({ a: v.string(), b: v.string() }),
      v.partialCheck([['a'], ['b']], () => true),
    );
    const result = v.safeParse(piped, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatIssues(result.issues)).toStrictEqual([
        { path: 'a', expected: '"a"' },
        { path: 'b', expected: '"b"' },
      ]);
    }
  });
});
