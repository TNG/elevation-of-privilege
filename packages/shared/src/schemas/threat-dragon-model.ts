import * as v from 'valibot';

import type { ThreatDragonModel } from '../game/ThreatDragonModel';

const Id = v.pipe(v.string(), v.regex(/^[\w-]{1,64}$/));

const Point = v.strictObject({
  x: v.number(),
  y: v.number(),
});

const End = v.strictObject({
  id: v.optional(Id),
  x: v.optional(v.number()),
  y: v.optional(v.number()),
});

const Style = v.strictObject({
  text: v.optional(v.string()),
  class: v.optional(v.string()),
  fill: v.optional(v.string()),
  stroke: v.optional(v.string()),
  'stroke-dasharray': v.optional(v.string()),
  d: v.optional(v.string()),
  transform: v.optional(v.string()),
  ref: v.optional(v.string()),
  'text-anchor': v.optional(v.string()),
  'y-alignment': v.optional(v.string()),
  'font-size': v.optional(v.string()),
  'font-weight': v.optional(v.string()),
  'stroke-width': v.optional(v.union([v.number(), v.string()])),
  r: v.optional(v.union([v.number(), v.string()])),
  width: v.optional(v.union([v.number(), v.string()])),
  height: v.optional(v.union([v.number(), v.string()])),
  'ref-x': v.optional(v.union([v.number(), v.string()])),
  'ref-y': v.optional(v.union([v.number(), v.string()])),
  'follow-scale': v.optional(v.boolean()),
});

const Attrs = v.strictObject({
  '.element-shape': v.optional(Style),
  '.element-text': v.optional(Style),
  text: v.optional(Style),
  rect: v.optional(Style),
  '.connection': v.optional(Style),
  '.connection-wrap': v.optional(Style),
  '.marker-source': v.optional(Style),
  '.marker-target': v.optional(Style),
  '.undefined': v.optional(Style),
  '#element-shape': v.optional(Style),
  '#element-process': v.optional(Style),
});

const Label = v.strictObject({
  position: v.union([
    v.number(),
    v.strictObject({
      distance: v.number(),
      offset: v.optional(v.union([v.number(), Point])),
    }),
  ]),
  attrs: v.optional(
    v.strictObject({
      text: v.optional(
        v.strictObject({
          text: v.optional(v.string()),
          'font-size': v.optional(v.string()),
          'font-weight': v.optional(v.string()),
        }),
      ),
    }),
  ),
});

const Threat = v.strictObject({
  title: v.optional(v.string()),
  type: v.optional(v.string()),
  status: v.optional(v.string()),
  severity: v.optional(v.string()),
  description: v.optional(v.string()),
  mitigation: v.optional(v.string()),
  modelType: v.optional(v.string()),
  threatId: v.optional(v.string()),
  ruleId: v.optional(v.string()),
  score: v.optional(v.string()),
  owner: v.optional(v.string()),
  id: v.optional(v.string()),
  game: v.optional(v.string()),
  $$hashKey: v.optional(v.string()),
  number: v.optional(v.number()),
});

const cellBaseEntries = {
  id: Id,
  z: v.optional(v.number()),
  attrs: v.optional(Attrs),
  size: v.optional(v.strictObject({ width: v.number(), height: v.number() })),
  hasOpenThreats: v.optional(v.boolean()),
  outOfScope: v.optional(v.boolean()),
  reasonOutOfScope: v.optional(v.string()),
  description: v.optional(v.string()),
  threats: v.optional(v.array(Threat)),
} as const;

const ProcessCell = v.strictObject({
  ...cellBaseEntries,
  type: v.literal('tm.Process'),
  angle: v.optional(v.number()),
  position: v.optional(Point),
  privilegeLevel: v.optional(v.string()),
  handlesCardPayment: v.optional(v.boolean()),
  handlesGoodsOrServices: v.optional(v.boolean()),
  isWebApplication: v.optional(v.boolean()),
});

const StoreCell = v.strictObject({
  ...cellBaseEntries,
  type: v.literal('tm.Store'),
  angle: v.optional(v.number()),
  position: v.optional(Point),
  isALog: v.optional(v.boolean()),
  storesCredentials: v.optional(v.boolean()),
  isEncrypted: v.optional(v.boolean()),
  isSigned: v.optional(v.boolean()),
  storesInventory: v.optional(v.boolean()),
});

const ActorCell = v.strictObject({
  ...cellBaseEntries,
  type: v.literal('tm.Actor'),
  angle: v.optional(v.number()),
  position: v.optional(Point),
  providesAuthentication: v.optional(v.boolean()),
});

const FlowCell = v.strictObject({
  ...cellBaseEntries,
  type: v.literal('tm.Flow'),
  source: v.optional(End),
  target: v.optional(End),
  vertices: v.optional(v.array(Point)),
  labels: v.optional(v.array(Label)),
  smooth: v.optional(v.boolean()),
  protocol: v.optional(v.string()),
  isEncrypted: v.optional(v.boolean()),
  isPublicNetwork: v.optional(v.boolean()),
});

const BoundaryCell = v.strictObject({
  ...cellBaseEntries,
  type: v.literal('tm.Boundary'),
  source: v.optional(End),
  target: v.optional(End),
  vertices: v.optional(v.array(Point)),
  labels: v.optional(v.array(Label)),
  smooth: v.optional(v.boolean()),
  isTrustBoundary: v.optional(v.boolean()),
});

const Cell = v.variant('type', [
  ProcessCell,
  StoreCell,
  ActorCell,
  FlowCell,
  BoundaryCell,
]);

const Diagram = v.object({
  id: v.union([v.number(), v.string()]),
  title: v.string(),
  thumbnail: v.optional(v.string()),
  diagramType: v.optional(v.string()),
  version: v.optional(v.string()),
  diagramTop: v.optional(v.number()),
  threatTop: v.optional(v.number()),
  reviewer: v.optional(v.string()),
  size: v.optional(
    v.object({
      width: v.union([v.number(), v.string()]),
      height: v.union([v.number(), v.string()]),
    }),
  ),
  diagramJson: v.object({
    cells: v.optional(v.array(Cell)),
  }),
});

/**
 * A Threat Dragon version 1 model, validated against a strict allowlist.
 *
 * The envelope strips unknown metadata (e.g. `extension`, `location`,
 * `$$hashKey`) so only declared content is ever stored (FR-007), while cells,
 * styling, labels and threats are strict and refuse anything else.
 */
const modelSchema = v.object({
  version: v.optional(v.string()),
  summary: v.object({
    title: v.string(),
    description: v.optional(v.string()),
    owner: v.optional(v.string()),
    id: v.optional(v.union([v.number(), v.string()])),
  }),
  detail: v.object({
    contributors: v.optional(v.array(v.object({ name: v.string() }))),
    reviewer: v.optional(v.string()),
    diagrams: v.pipe(v.array(Diagram), v.minLength(1)),
  }),
});

export type ThreatDragonModelSchemaOutput = v.InferOutput<typeof modelSchema>;

// The explicit annotation keeps consumers from re-computing the deeply
// inferred schema type (TS2589). It is justified by the compile-time check
// below: the inferred output is assignable to the storage interface.
export const threatDragonModelSchema: v.GenericSchema<
  unknown,
  ThreatDragonModel
> = modelSchema;

// Compile-time check: the validated output must be storable as a ThreatDragonModel.
const _storableSchemaOutput: ThreatDragonModel =
  {} as ThreatDragonModelSchemaOutput;
void _storableSchemaOutput;
