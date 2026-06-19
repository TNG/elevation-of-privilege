/**
 * Threat Dragon V1 threat model types and adapter.
 *
 * This module is intentionally self-contained so that V1 support can be
 * dropped in the future by deleting this single file (plus simplifying the
 * dispatcher in `ThreatDragonModel.ts`).
 *
 * Based on the schema at
 * https://owasp.org/www-project-threat-dragon/assets/schemas/owasp.threat-dragon.schema.V1.json
 */
import type {
  ThreatDragonThreat,
  ThreatModelAdapter,
} from './ThreatDragonModel';

export interface ThreatDragonModelV1 {
  version?: string;
  summary: {
    description?: string;
    id?: number;
    owner?: string;
    title: string;
  };
  detail: {
    contributors?: ContributorV1[];
    diagrams: DiagramV1[];
  };
}

export interface ContributorV1 {
  name: string;
}

export interface DiagramV1 {
  diagramType: string;
  id: number;
  size: {
    height: number;
    width: number;
  };
  thumbnail: string;
  title: string;
  version?: string;
  diagramJson: DiagramJsonV1;
  diagramTop?: number;
  reviewer?: string;
  threatTop?: number;
}

export interface DiagramJsonV1 {
  cells?: ThreatDragonComponentV1[];
}

export interface ThreatDragonComponentV1 {
  attrs: {
    '.element-shape'?: { class?: string };
    text?: { text: string };
    '.element-text'?: { class?: string };
  };
  angle?: number;
  description?: string;
  handlesCardPayment?: boolean;
  handlesGoodsOrServices?: boolean;
  hasOpenThreats?: boolean;
  id: string;
  isALog?: boolean;
  isWebApplication?: boolean;
  isEncrypted?: boolean;
  isSigned?: boolean;
  isTrustBoundary?: boolean;
  labels?: LabelV1[];
  outOfScope?: boolean;
  position?: { x: number; y: number; [k: string]: unknown };
  privilegeLevel?: string;
  reasonOutOfScope?: string;
  size: { height: number; width: number };
  smooth?: boolean;
  source?: { id?: string; x?: number; y?: number };
  storesCredentials?: boolean;
  storesInventory?: boolean;
  target?: { id?: string; x?: number; y?: number };
  threats?: ThreatDragonThreat[];
  type: CellTypeV1;
  vertices?: { x: number; y: number };
  z: number;
}

export interface LabelV1 {
  position: number;
  attrs: {
    text: {
      'font-size': string;
      'font-weight': string;
      text: string;
    };
  };
}

export type CellTypeV1 =
  | 'tm.Process'
  | 'tm.Store'
  | 'tm.Actor'
  | 'tm.Flow'
  | 'tm.Boundary';

export const v1Adapter: ThreatModelAdapter<
  ThreatDragonModelV1,
  ThreatDragonComponentV1
> = {
  getDiagramCells(model, diagramIdx) {
    return model.detail.diagrams[diagramIdx]?.diagramJson.cells;
  },

  findCell(model, diagramIdx, cellId) {
    return model.detail.diagrams[diagramIdx]?.diagramJson.cells?.find(
      (c) => c.id === cellId,
    );
  },

  getCellThreats(cell) {
    return cell.threats ?? [];
  },

  setCellThreats(cell, threats) {
    cell.threats = threats;
  },

  getComponentName(component) {
    if (component === undefined) return '';

    const prefix = component.type.slice(3);

    if (component.type === 'tm.Flow') {
      return `${prefix}: ${component.labels?.[0]?.attrs.text.text}`;
    }

    return `${prefix}: ${component.attrs.text?.text}`;
  },

  toJointGraph(model, diagramIdx) {
    const diagramJson = model.detail.diagrams[diagramIdx]?.diagramJson;
    return { cells: diagramJson?.cells ?? [] };
  },

  validate(model) {
    const errors: string[] = [];

    if (typeof model !== 'object' || model === null || Array.isArray(model)) {
      return { valid: false, errors: ['Model must be an object'] };
    }

    const m = model as Record<string, unknown>;
    const summary = m.summary as Record<string, unknown> | undefined;
    if (!summary || typeof summary.title !== 'string') {
      errors.push('summary.title must be a string');
    }

    const detail = m.detail as Record<string, unknown> | undefined;
    if (!detail || !Array.isArray(detail.diagrams)) {
      errors.push('detail.diagrams must be an array');
      return { valid: errors.length === 0, errors };
    }

    for (const [i, d] of (detail.diagrams as unknown[]).entries()) {
      const diag = d as Record<string, unknown>;
      if (!diag || typeof diag !== 'object' || !diag.diagramJson) {
        errors.push(`diagram[${i}].diagramJson is missing`);
      }
    }

    return { valid: errors.length === 0, errors };
  },
};
