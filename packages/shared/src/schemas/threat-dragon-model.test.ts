import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

import * as v from 'valibot';

import { formatIssues } from './format-issues';
import { threatDragonModelSchema } from './threat-dragon-model';

import type { ThreatDragonModel } from '../game/ThreatDragonModel';

const fixturesDir = new URL('./__fixtures__/threat-dragon/', import.meta.url);

const loadFixture = (...path: string[]): unknown =>
  JSON.parse(readFileSync(new URL(path.join('/'), fixturesDir), 'utf-8'));

const v1Files = readdirSync(new URL('./v1', fixturesDir)).filter((file) =>
  file.endsWith('.json'),
);

const v2Files = readdirSync(new URL('./v2', fixturesDir)).filter((file) =>
  file.endsWith('.json'),
);

const parse = (input: unknown) => v.safeParse(threatDragonModelSchema, input);

const modelIssues = (input: unknown) => {
  const result = parse(input);
  expect(result.success).toBe(false);
  return formatIssues(result.success ? [] : result.issues, 'model');
};

/** A minimal valid model with a single cell, deeply cloned for mutation. */
const minimalModel = (): ThreatDragonModel =>
  JSON.parse(
    JSON.stringify({
      summary: { title: 'x' },
      detail: {
        diagrams: [
          {
            id: 0,
            title: 'd',
            diagramJson: {
              cells: [
                {
                  id: 'cell1',
                  type: 'tm.Actor',
                  attrs: { text: { text: 'A' } },
                },
              ],
            },
          },
        ],
      },
    }),
  ) as ThreatDragonModel;

/** Clones the minimal model and applies a mutation. */
const modelWith = (mutate: (model: ThreatDragonModel) => void) => {
  const model = minimalModel();
  mutate(model);
  return model;
};

const firstCell = (model: ThreatDragonModel) =>
  model.detail.diagrams[0]!.diagramJson.cells![0]!;

describe('threatDragonModelSchema golden corpus', () => {
  it.each(v1Files)('accepts the golden V1 export %s', (file) => {
    const result = parse(loadFixture('v1', file));
    expect(result.success).toBe(true);
  });

  it.each(v2Files)('refuses the V2 export %s', (file) => {
    const result = parse(loadFixture('v2', file));
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.issues.map((issue) => v.getDotPath(issue));
      expect(
        paths.some(
          (path) => path?.endsWith('.shape') || path?.endsWith('.type'),
        ),
      ).toBe(true);
    }
  });

  it('strips metadata keys like extension, location and $$hashKey (FR-007)', () => {
    const model = loadFixture('v1', 'core-test-model.json');
    const decorated = JSON.parse(JSON.stringify(model)) as {
      extension?: string;
      location?: string;
      detail: {
        diagrams: Array<Record<string, unknown>>;
        contributors?: Array<{ name: string; $$hashKey?: string }>;
      };
    };
    decorated.extension = 'png';
    decorated.location = 'http://example.com/other-game';
    decorated.detail.diagrams[0].$$hashKey = '00A';
    decorated.detail.contributors = decorated.detail.contributors ?? [];
    decorated.detail.contributors.push({ name: 'x' });
    decorated.detail.contributors[0]!.$$hashKey = '00B';

    const result = parse(decorated);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).not.toHaveProperty('extension');
      expect(result.output).not.toHaveProperty('location');
      expect(result.output.detail.diagrams[0]).not.toHaveProperty('$$hashKey');
      expect(result.output.detail.contributors?.[0]).not.toHaveProperty(
        '$$hashKey',
      );
    }
  });
});

describe('threatDragonModelSchema refusals', () => {
  const CELL = 'model.detail.diagrams.0.diagramJson.cells.0';

  describe('markup-carrying and V2 cell keys are refused (FR-008)', () => {
    const forbiddenKeys = [
      'markup',
      'toolMarkup',
      'labelMarkup',
      'vertexMarkup',
      'arrowheadMarkup',
      'doubleToolMarkup',
      'ports',
      'portMarkup',
      'shape',
    ] as const;

    it.each(forbiddenKeys)('refuses the cell key %s', (key) => {
      const issues = modelIssues(
        modelWith((model) => {
          (firstCell(model) as Record<string, unknown>)[key] =
            '<image href="/x" onerror="alert(1)"/>';
        }),
      );
      expect(issues).toContainEqual({
        path: `${CELL}.${key}`,
        expected: 'never',
      });
    });
  });

  describe('styling attributes are limited to the allowlist (FR-009)', () => {
    const forbiddenAttrs = [
      'onclick',
      'onload',
      'html',
      'href',
      'xlink:href',
      'style',
    ] as const;

    it.each(forbiddenAttrs)('refuses attrs[".element-shape"].%s', (attr) => {
      const issues = modelIssues(
        modelWith((model) => {
          firstCell(model).attrs!['.element-shape'] = {
            [attr]: 'alert(1)',
          } as never;
        }),
      );
      expect(issues).toContainEqual({
        path: `${CELL}.attrs..element-shape.${attr}`,
        expected: 'never',
      });
    });

    it('refuses an unknown selector key in attrs', () => {
      const issues = modelIssues(
        modelWith((model) => {
          firstCell(model).attrs!.foreignObject = {
            html: '<script>alert(1)</script>',
          } as never;
        }),
      );
      expect(issues).toContainEqual({
        path: `${CELL}.attrs.foreignObject`,
        expected: 'never',
      });
    });

    it('refuses a non-string text value', () => {
      const issues = modelIssues(
        modelWith((model) => {
          firstCell(model).attrs!.text = { text: 42 } as never;
        }),
      );
      expect(issues).toContainEqual({
        path: `${CELL}.attrs.text.text`,
        expected: 'string',
      });
    });
  });

  describe('labels contain only position and text styling (FR-010)', () => {
    /** Labels only exist on flow and boundary cells, so switch the cell type. */
    const flowModelWithLabels = (labels: unknown[]) =>
      modelWith((model) => {
        firstCell(model).type = 'tm.Flow' as never;
        (firstCell(model) as unknown as { labels?: unknown[] }).labels = labels;
      });

    it('refuses a label with markup', () => {
      const issues = modelIssues(
        flowModelWithLabels([{ position: 0.5, markup: '<rect/>' }]),
      );
      expect(issues).toContainEqual({
        path: `${CELL}.labels.0.markup`,
        expected: 'never',
      });
    });

    it('refuses label attrs with html', () => {
      const issues = modelIssues(
        flowModelWithLabels([
          { position: 0.5, attrs: { text: { html: '<b>x</b>' } } },
        ]),
      );
      expect(issues).toContainEqual({
        path: `${CELL}.labels.0.attrs.text.html`,
        expected: 'never',
      });
    });
  });

  describe('only the five declared element types are accepted (FR-008)', () => {
    it.each(['tm.Image', 'basic.Rect'])('refuses the cell type %s', (type) => {
      const issues = modelIssues(
        modelWith((model) => {
          firstCell(model).type = type as never;
        }),
      );
      expect(issues.map((issue) => issue.path)).toContain(`${CELL}.type`);
    });
  });

  describe('element identifiers are restricted (FR-012)', () => {
    it.each([
      ['spaces', 'a b'],
      ['angle brackets', '<x>'],
      ['too long (65 chars)', 'a'.repeat(65)],
    ])('refuses the id variant "%s"', (_name, id) => {
      const issues = modelIssues(
        modelWith((model) => {
          firstCell(model).id = id;
        }),
      );
      expect(issues.map((issue) => issue.path)).toContain(`${CELL}.id`);
    });
  });

  describe('threats contain only the known fields (FR-011)', () => {
    it('refuses a threat with an unknown key', () => {
      const issues = modelIssues(
        modelWith((model) => {
          const cell = firstCell(model) as unknown as { threats?: unknown[] };
          cell.threats = [{ title: 't', suspicious: 'alert(1)' }];
        }),
      );
      expect(issues).toContainEqual({
        path: `${CELL}.threats.0.suspicious`,
        expected: 'never',
      });
    });

    it('refuses a threat with a numeric title', () => {
      const issues = modelIssues(
        modelWith((model) => {
          const cell = firstCell(model) as unknown as { threats?: unknown[] };
          cell.threats = [{ title: 42 }];
        }),
      );
      expect(issues).toContainEqual({
        path: `${CELL}.threats.0.title`,
        expected: 'string',
      });
    });
  });

  describe('the model itself must be structured data with a title and a diagram (FR-006)', () => {
    it.each([42, 'str', [], null])('refuses the bare value %j', (value) => {
      expect(parse(value).success).toBe(false);
    });

    it('refuses a missing summary title', () => {
      const issues = modelIssues(
        modelWith((model) => {
          delete (model.summary as Record<string, unknown>).title;
        }),
      );
      expect(issues).toContainEqual({
        path: 'model.summary.title',
        expected: '"title"',
      });
    });

    it('refuses a model without diagrams', () => {
      const issues = modelIssues(
        modelWith((model) => {
          model.detail.diagrams = [];
        }),
      );
      expect(issues.map((issue) => issue.path)).toContain(
        'model.detail.diagrams',
      );
    });
  });
});
