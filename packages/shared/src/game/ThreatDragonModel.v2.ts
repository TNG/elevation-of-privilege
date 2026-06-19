/**
 * Threat Dragon V2 threat model types and adapter.
 *
 * This module is intentionally self-contained so that V1 and V2 are clearly
 * separated. The V2 adapter handles the differences between the V2 schema
 * (cells with shape/zIndex/data, threats in data.threats) and the V1-based
 * JointJS rendering pipeline used by this project.
 *
 * References:
 * - OWASP Threat Dragon schema V2:
 *   https://owasp.org/www-project-threat-dragon/assets/schemas/owasp.threat-dragon.schema.V2.json
 * - Threat Dragon V2 data structure (cells/data/threats):
 *   https://deepwiki.com/OWASP/threat-dragon/2.1-threat-model-data-structure
 */
import type {
  ThreatDragonThreat,
  ThreatModelAdapter,
} from './ThreatDragonModel';

export interface ThreatDragonModelV2 {
  version: string;
  summary: ThreatDragonSummaryV2;
  detail: ThreatDragonDetailV2;
  [k: string]: unknown;
}

export interface ThreatDragonSummaryV2 {
  title: string;
  owner?: string;
  description?: string;
  id?: number | string;
  [k: string]: unknown;
}

export interface ThreatDragonDetailV2 {
  contributors: ContributorV2[];
  diagrams: DiagramV2[];
  diagramTop: number;
  threatTop: number;
  reviewer: string;
  [k: string]: unknown;
}

export interface ContributorV2 {
  name: string;
  [k: string]: unknown;
}

export interface DiagramV2 {
  id: number;
  title: string;
  diagramType: string;
  description?: string;
  placeholder?: string;
  thumbnail: string;
  version: string;
  cells: CellV2[];
  [k: string]: unknown;
}

export interface PointV2 {
  x: number;
  y: number;
  [k: string]: unknown;
}

export interface CellV2 {
  id: string;
  shape: string;
  zIndex: number;
  attrs?: Record<string, unknown>;
  data: CellDataV2;
  visible?: boolean;
  position?: PointV2;
  size?: { width: number; height: number; [k: string]: unknown };
  source?: EdgeEndV2;
  target?: EdgeEndV2;
  vertices?: PointV2[];
  connector?: string;
  labels?: EdgeLabelV2[];
  ports?: PortsV2;
  width?: number;
  height?: number;
  angle?: number;
  [k: string]: unknown;
}

export interface EdgeEndV2 {
  cell?: string;
  port?: string;
  x?: number;
  y?: number;
  [k: string]: unknown;
}

export interface EdgeLabelV2 {
  attrs?: Record<string, unknown>;
  markup?: Array<{ tagName: string; selector: string; [k: string]: unknown }>;
  position?: {
    distance?: number;
    args?: Record<string, unknown>;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface PortsV2 {
  groups?: Record<
    string,
    {
      position?: string;
      attrs?: Record<string, unknown>;
      [k: string]: unknown;
    }
  >;
  items?: Array<{
    group: string;
    id: string;
    [k: string]: unknown;
  }>;
  [k: string]: unknown;
}

export interface BaseCellDataV2 {
  type: string;
  name: string;
  description?: string;
  outOfScope?: boolean;
  reasonOutOfScope?: string;
  hasOpenThreats: boolean;
  isTrustBoundary?: boolean;
  threats?: ThreatDragonThreat[];
  [k: string]: unknown;
}

export type CellDataV2 =
  | ProcessDataV2
  | StoreDataV2
  | ActorDataV2
  | FlowDataV2
  | BoundaryDataV2
  | BoundaryBoxDataV2
  | TextBlockDataV2
  | (BaseCellDataV2 & { type: string });

export interface ProcessDataV2 extends BaseCellDataV2 {
  type: 'tm.Process';
  handlesCardPayment?: boolean;
  handlesGoodsOrServices?: boolean;
  isWebApplication?: boolean;
  privilegeLevel?: string;
  [k: string]: unknown;
}

export interface StoreDataV2 extends BaseCellDataV2 {
  type: 'tm.Store';
  isALog?: boolean;
  isEncrypted?: boolean;
  isSigned?: boolean;
  storesCredentials?: boolean;
  storesInventory?: boolean;
  [k: string]: unknown;
}

export interface ActorDataV2 extends BaseCellDataV2 {
  type: 'tm.Actor';
  providesAuthentication?: boolean;
  [k: string]: unknown;
}

export interface FlowDataV2 extends BaseCellDataV2 {
  type: 'tm.Flow';
  isBidirectional?: boolean;
  isEncrypted?: boolean;
  isPublicNetwork?: boolean;
  protocol?: string;
  [k: string]: unknown;
}

export interface BoundaryDataV2 extends BaseCellDataV2 {
  type: 'tm.Boundary';
  isTrustBoundary: boolean;
  [k: string]: unknown;
}

export interface BoundaryBoxDataV2 extends BaseCellDataV2 {
  type: 'tm.BoundaryBox';
  isTrustBoundary: boolean;
  [k: string]: unknown;
}

export interface TextBlockDataV2 extends BaseCellDataV2 {
  type: 'tm.Text';
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// JointJS adaptation types (internal)
// ---------------------------------------------------------------------------

type JointAttrs = Record<string, unknown>;

type JointEdgeEnd =
  | { id: string; port?: string }
  | { x: number; y: number }
  | Record<string, never>;

interface JointLabel {
  position: number;
  attrs: {
    text: { text: string };
  };
}

interface JointCellBase {
  id: string;
  type: string;
  z: number;
  attrs: JointAttrs;
  description?: string;
  hasOpenThreats?: boolean;
  outOfScope?: boolean;
  reasonOutOfScope?: string;
  isTrustBoundary?: boolean;
  threats?: unknown[];
  visible?: boolean;
  angle?: number;
}

interface JointNodeCell extends JointCellBase {
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface JointEdgeCell extends JointCellBase {
  source: JointEdgeEnd;
  target: JointEdgeEnd;
  vertices: Array<{ x: number; y: number }>;
  smooth?: boolean;
  labels?: JointLabel[];
  isBidirectional?: boolean;
  isEncrypted?: boolean;
  isPublicNetwork?: boolean;
  protocol?: string;
}

type JointCell = JointNodeCell | JointEdgeCell;

// ---------------------------------------------------------------------------
// V2 Adapter
// ---------------------------------------------------------------------------

export const v2Adapter: ThreatModelAdapter<ThreatDragonModelV2, CellV2> = {
  getDiagramCells(model, diagramIdx) {
    return model.detail.diagrams[diagramIdx]?.cells;
  },

  findCell(model, diagramIdx, cellId) {
    return model.detail.diagrams[diagramIdx]?.cells?.find(
      (c) => c.id === cellId,
    );
  },

  getCellThreats(cell) {
    const fromData = cell.data?.threats;
    if (fromData) return fromData;
    const fromCell = (cell as { threats?: ThreatDragonThreat[] }).threats;
    return fromCell ?? [];
  },

  setCellThreats(cell, threats) {
    if (!cell.data) {
      cell.data = { type: '', name: '', hasOpenThreats: false } as CellDataV2;
    }
    cell.data.threats = threats;
    cell.data.hasOpenThreats =
      cell.data.hasOpenThreats || threats.some((t) => t.status === 'Open');
  },

  getComponentName(component) {
    if (!component) return '';

    const type = getV2CellType(component);
    const prefix = type.startsWith('tm.') ? type.slice(3) : type;

    if (type === 'tm.Flow') {
      const flowLabel = getV2FlowLabel(component);
      const fallbackName = getV2CellDisplayName(component);
      const name = flowLabel || fallbackName;
      return name ? `${prefix}: ${name}` : `${prefix}`;
    }

    const name = getV2CellDisplayName(component);
    return name ? `${prefix}: ${name}` : `${prefix}`;
  },

  toJointGraph(model, diagramIdx) {
    const diagram = model.detail.diagrams[diagramIdx];
    if (!diagram) return { cells: [] };
    return toJointGraphJson(diagram);
  },

  validate(model) {
    const errors: string[] = [];

    if (typeof model !== 'object' || model === null || Array.isArray(model)) {
      return { valid: false, errors: ['Model must be an object'] };
    }

    const m = model as Record<string, unknown>;

    if (typeof m.version !== 'string') {
      errors.push('version must be a string');
    }

    const summary = m.summary as Record<string, unknown> | undefined;
    if (!summary || typeof summary.title !== 'string') {
      errors.push('summary.title must be a string');
    }

    const detail = m.detail as Record<string, unknown> | undefined;
    if (!detail || !Array.isArray(detail.diagrams)) {
      errors.push('detail.diagrams must be an array');
      return { valid: errors.length === 0, errors };
    }

    if (typeof detail.diagramTop !== 'number') {
      errors.push('detail.diagramTop must be a number');
    }

    if (typeof detail.threatTop !== 'number') {
      errors.push('detail.threatTop must be a number');
    }

    for (const [i, d] of (detail.diagrams as unknown[]).entries()) {
      const diag = d as Record<string, unknown>;
      if (!diag || typeof diag !== 'object' || !Array.isArray(diag.cells)) {
        errors.push(`diagram[${i}].cells must be an array`);
      }
    }

    return { valid: errors.length === 0, errors };
  },
};

// ---------------------------------------------------------------------------
// V2 → JointJS graph adaptation (private helpers)
// ---------------------------------------------------------------------------

function toJointGraphJson(diagram: DiagramV2): { cells: JointCell[] } {
  const cells = (diagram.cells ?? [])
    .map(v2CellToJointCell)
    .filter((c): c is JointCell => c !== null);
  return { cells };
}

function v2CellToJointCell(cell: CellV2): JointCell | null {
  const dataType = cell.data?.type;
  const shape = cell.shape;

  const base: JointCellBase = {
    id: cell.id,
    type: mapToJointType(shape, dataType),
    z: cell.zIndex ? cell.zIndex : 0,
    attrs: normalizeAttrs(cell),
  };

  if (cell.angle !== undefined) {
    base.angle = cell.angle;
  }

  // Node cells: position + size
  if (cell.position && cell.size) {
    const node: JointNodeCell = {
      ...base,
      position: { x: cell.position.x, y: cell.position.y },
      size: { width: cell.size.width, height: cell.size.height },
      description: cell.data?.description ?? '',
      hasOpenThreats: !!cell.data?.hasOpenThreats,
      outOfScope: !!cell.data?.outOfScope,
      reasonOutOfScope: cell.data?.reasonOutOfScope ?? '',
      isTrustBoundary: !!cell.data?.isTrustBoundary,
      threats: cell.data?.threats ?? [],
      visible: typeof cell.visible === 'boolean' ? cell.visible : undefined,
    };
    return node;
  }

  // Edge cells: source/target/vertices (flows, boundary curves)
  if (cell.source || cell.target) {
    const edge: JointEdgeCell = {
      ...base,
      source: mapEdgeEnd(cell.source),
      target: mapEdgeEnd(cell.target),
      vertices: Array.isArray(cell.vertices)
        ? cell.vertices.map((v) => ({ x: v.x, y: v.y }))
        : [],
      smooth:
        typeof cell.connector === 'string'
          ? cell.connector === 'smooth'
          : undefined,
      description: cell.data?.description ?? '',
      hasOpenThreats: !!cell.data?.hasOpenThreats,
      outOfScope: !!cell.data?.outOfScope,
      reasonOutOfScope: cell.data?.reasonOutOfScope ?? '',
      isTrustBoundary: !!cell.data?.isTrustBoundary,
      threats: cell.data?.threats ?? [],
      visible: typeof cell.visible === 'boolean' ? cell.visible : undefined,
    };

    const labels = mapEdgeLabels(cell);
    if (labels.length) edge.labels = labels;

    if (cell.data?.type === 'tm.Flow') {
      const d = cell.data;
      edge.isBidirectional = !!d.isBidirectional;
      edge.isEncrypted = !!d.isEncrypted;
      edge.isPublicNetwork = !!d.isPublicNetwork;
      edge.protocol = typeof d.protocol === 'string' ? d.protocol : '';
    }

    return edge;
  }

  // Fallback: if neither node nor edge fields exist, render as node with
  // best-effort geometry so the cell is at least visible.
  if (cell.data) {
    const node: JointNodeCell = {
      ...base,
      position: cell.position
        ? { x: cell.position.x, y: cell.position.y }
        : { x: 0, y: 0 },
      size: cell.size
        ? { width: cell.size.width, height: cell.size.height }
        : { width: 100, height: 100 },
      description: cell.data?.description ?? '',
      hasOpenThreats: !!cell.data?.hasOpenThreats,
      outOfScope: !!cell.data?.outOfScope,
      reasonOutOfScope: cell.data?.reasonOutOfScope ?? '',
      isTrustBoundary: !!cell.data?.isTrustBoundary,
      threats: cell.data?.threats ?? [],
      visible: typeof cell.visible === 'boolean' ? cell.visible : undefined,
    };
    return node;
  }

  return null;
}

function mapToJointType(shape: string, dataType?: string): string {
  if (typeof dataType === 'string' && dataType.startsWith('tm.')) {
    if (dataType === 'tm.BoundaryBox') return 'tm.Boundary';
    if (dataType === 'tm.Text') return 'tm.Process';
    return dataType;
  }

  switch (shape) {
    case 'process':
      return 'tm.Process';
    case 'actor':
      return 'tm.Actor';
    case 'store':
      return 'tm.Store';
    case 'flow':
      return 'tm.Flow';
    case 'trust-boundary-curve':
    case 'trust-boundary-box':
      return 'tm.Boundary';
    default:
      return 'tm.Process';
  }
}

function mapEdgeEnd(end: CellV2['source']): JointEdgeEnd {
  if (!end) return {};

  if (typeof end.x === 'number' && typeof end.y === 'number') {
    return { x: end.x, y: end.y };
  }

  if (typeof end.cell === 'string') {
    return {
      id: end.cell,
      port: typeof end.port === 'string' ? end.port : undefined,
    };
  }

  return {};
}

function normalizeAttrs(cell: CellV2): JointAttrs {
  const attrs: JointAttrs = { ...(cell.attrs ?? {}) };
  const name = getV2CellName(cell);
  if (name) {
    const textObj = (attrs as { text?: Record<string, unknown> }).text ?? {};
    (attrs as { text?: Record<string, unknown> }).text = textObj;
    if (typeof (textObj as { text?: unknown }).text !== 'string') {
      (textObj as { text?: unknown }).text = name;
    }
  }
  return attrs;
}

function getV2CellName(cell: CellV2): string {
  if (typeof cell.data?.name === 'string' && cell.data.name.trim()) {
    return cell.data.name;
  }
  const a = cell.attrs;
  if (a && typeof a === 'object') {
    const t1 = (a as { text?: { text?: unknown } }).text?.text;
    if (typeof t1 === 'string' && t1.trim()) return t1;
    const t2 = (a as { label?: { text?: unknown } }).label?.text;
    if (typeof t2 === 'string' && t2.trim()) return t2;
  }
  return '';
}

function mapEdgeLabels(cell: CellV2): JointLabel[] {
  const labels = cell.labels ?? [];
  const out: JointLabel[] = [];
  for (const l of labels) {
    const attrs = l.attrs;
    if (!attrs || typeof attrs !== 'object') continue;

    const labelText = (attrs as { labelText?: { text?: unknown } }).labelText
      ?.text;
    const fallback = (attrs as { label?: { text?: unknown } }).label?.text;

    const text =
      typeof labelText === 'string' && labelText.trim()
        ? labelText
        : typeof fallback === 'string'
          ? fallback
          : '';

    if (!text || !text.trim()) continue;

    out.push({
      position:
        typeof l.position?.distance === 'number' ? l.position.distance : 0.5,
      attrs: { text: { text } },
    });
  }
  return out;
}

function getV2CellType(cell: CellV2): string {
  return typeof cell.data?.type === 'string' ? cell.data.type : '';
}

function getV2CellDisplayName(cell: CellV2): string {
  const dataName = cell.data?.name;
  if (typeof dataName === 'string' && dataName.trim()) return dataName;

  const attrs = cell.attrs;
  if (attrs && typeof attrs === 'object') {
    const t1 = (attrs as { text?: { text?: unknown } }).text?.text;
    if (typeof t1 === 'string' && t1.trim()) return t1;
    const t2 = (attrs as { label?: { text?: unknown } }).label?.text;
    if (typeof t2 === 'string' && t2.trim()) return t2;
  }
  return '';
}

function getV2FlowLabel(cell: CellV2): string {
  const labels = cell.labels ?? [];
  if (!Array.isArray(labels) || labels.length === 0) return '';

  const attrs = labels[0]?.attrs;
  if (!attrs || typeof attrs !== 'object') return '';

  const labelText = (attrs as { labelText?: { text?: unknown } }).labelText
    ?.text;
  if (typeof labelText === 'string' && labelText.trim()) return labelText;

  const label = (attrs as { label?: { text?: unknown } }).label?.text;
  if (typeof label === 'string' && label.trim()) return label;

  return '';
}
