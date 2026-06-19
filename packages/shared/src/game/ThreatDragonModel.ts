/**
 * Threat Dragon model dispatcher.
 *
 * This is the only place that knows about both V1 and V2. All call sites
 * (endpoints, model rendering, threatbar) go through `getModelAdapter(model)`
 * and never branch on version themselves. When V1 support is dropped, delete
 * `ThreatDragonModel.v1.ts` and simplify this dispatcher to return `v2Adapter`
 * directly — no call-site changes are required.
 */
import { v1Adapter } from './ThreatDragonModel.v1';
import type { ThreatDragonModelV1 } from './ThreatDragonModel.v1';
import { v2Adapter } from './ThreatDragonModel.v2';
import type { ThreatDragonModelV2 } from './ThreatDragonModel.v2';

// Re-export the versioned modules so consumers can `import { ... } from '@eop/shared'`.
export * from './ThreatDragonModel.v1';
export * from './ThreatDragonModel.v2';

/**
 * Threat Dragon threat structure. This is identical between V1 and V2, so it
 * lives here as a shared type.
 */
export interface ThreatDragonThreat {
  description: string;
  mitigation: string;
  modelType?: string;
  number?: number;
  score?: string;
  severity: string;
  status: string;
  threatId?: string;
  title: string;
  type: string;

  // custom properties added by EoP
  owner?: string;
  id?: string;
  game?: string;
  [k: string]: unknown;
}

/**
 * Union of both supported model versions.
 */
export type AnyThreatDragonModel = ThreatDragonModelV1 | ThreatDragonModelV2;

/**
 * Common contract for version-specific operations. Each version module
 * implements this interface; the dispatcher selects the right one.
 */
export interface ThreatModelAdapter<M = AnyThreatDragonModel, C = unknown> {
  getDiagramCells(model: M, diagramIdx: number): C[] | undefined;
  findCell(model: M, diagramIdx: number, cellId: string): C | undefined;
  getCellThreats(cell: C): ThreatDragonThreat[];
  setCellThreats(cell: C, threats: ThreatDragonThreat[]): void;
  getComponentName(component: C | undefined): string;
  toJointGraph(model: M, diagramIdx: number): { cells: unknown[] };
  validate(model: unknown): { valid: boolean; errors: string[] };
}

/**
 * Detect whether a model is a V2 model.
 *
 * V2 models place `cells` directly on the diagram object, whereas V1 models
 * nest cells under `diagramJson`. We check the first diagram that has either
 * `cells` or `diagramJson`, falling back to scanning all diagrams if the first
 * is empty.
 */
export function isThreatDragonModelV2(
  model: AnyThreatDragonModel,
): model is ThreatDragonModelV2 {
  const diagrams = model.detail?.diagrams;
  if (!Array.isArray(diagrams)) return false;

  for (const d of diagrams) {
    const diag = d as { cells?: unknown; diagramJson?: unknown };
    if (diag.cells !== undefined) return true;
    if (diag.diagramJson !== undefined) return false;
  }

  // No diagram exposed cells/diagramJson — treat presence of V2-only
  // detail counters as a signal, otherwise default to V1.
  const detail = model.detail as {
    diagramTop?: unknown;
    threatTop?: unknown;
  };
  return detail.diagramTop !== undefined || detail.threatTop !== undefined;
}

export function getModelVersion(model: AnyThreatDragonModel): 'v1' | 'v2' {
  return isThreatDragonModelV2(model) ? 'v2' : 'v1';
}

/**
 * The only place that selects between V1 and V2 adapters.
 */
export function getModelAdapter(
  model: AnyThreatDragonModel,
): ThreatModelAdapter {
  return isThreatDragonModelV2(model)
    ? (v2Adapter as ThreatModelAdapter)
    : (v1Adapter as ThreatModelAdapter);
}

/**
 * Upload-time validation + version detection. Returns the detected version
 * (if any) and validation errors. Used by the create-game endpoint and the
 * create page UI.
 */
export function validateThreatDragonModel(raw: unknown): {
  valid: boolean;
  version?: 'v1' | 'v2';
  errors: string[];
} {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: ['Model must be an object'] };
  }

  const model = raw as Record<string, unknown>;
  const detail = model.detail as
    | { diagrams?: unknown[]; diagramTop?: unknown; threatTop?: unknown }
    | undefined;

  if (!detail || !Array.isArray(detail.diagrams)) {
    return {
      valid: false,
      errors: ['detail.diagrams must be an array'],
    };
  }

  // Detect version: any diagram with `cells` (directly) means V2.
  let looksV2 = false;
  let looksV1 = false;
  for (const d of detail.diagrams) {
    const diag = d as { cells?: unknown; diagramJson?: unknown } | null;
    if (diag && diag.cells !== undefined) looksV2 = true;
    if (diag && diag.diagramJson !== undefined) looksV1 = true;
  }
  if (!looksV2 && !looksV1) {
    // fall back to V2-only detail counters
    looksV2 = detail.diagramTop !== undefined || detail.threatTop !== undefined;
  }

  const version: 'v1' | 'v2' | undefined =
    looksV2 && !looksV1 ? 'v2' : looksV1 && !looksV2 ? 'v1' : undefined;

  // If both signals present (mixed), prefer V2 — the V2 adapter's dual-read
  // for threats tolerates V1-shaped `cell.threats` as a fallback.
  const effectiveVersion = version ?? 'v2';
  const adapter =
    effectiveVersion === 'v2'
      ? (v2Adapter as ThreatModelAdapter)
      : (v1Adapter as ThreatModelAdapter);

  const result = adapter.validate(raw);
  return {
    valid: result.valid,
    version: effectiveVersion,
    errors: result.errors,
  };
}
