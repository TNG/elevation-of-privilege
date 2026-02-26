
/**
 * Threat Dragon V2 threat model types
 *
 * References:
 * - OWASP Threat Dragon schema V2:
 *   https://owasp.org/www-project-threat-dragon/assets/schemas/owasp.threat-dragon.schema.V2.json
 * - Threat Dragon V2 data structure documentation (cells/data/threats):
 *   https://deepwiki.com/OWASP/threat-dragon/2.1-threat-model-data-structure
 *
 * Notes:
 * - V2 diagrams contain `cells` directly (no `diagramJson`).
 * - Cells use `shape` and `zIndex` and store domain data in `data`.
 * - Real-world V2 models may contain additional properties not strictly described by schema;
 *   therefore most objects include `[k: string]: unknown` for forward compatibility.
 */

export interface ThreatDragonModelV2 {
  /** Threat Dragon version used in the model (required in V2) */
  version: string;

  /** Threat model project meta-data */
  summary: ThreatDragonSummaryV2;

  /** Threat model definition */
  detail: ThreatDragonDetailV2;

  [k: string]: unknown;
}

export interface ThreatDragonSummaryV2 {
  /** Threat model title (required) */
  title: string;

  /** The original creator or overall owner of the model */
  owner?: string;

  /** Description of the threat model used for report outputs */
  description?: string;

  /** A unique identifier for this main threat model object */
  id?: number;

  [k: string]: unknown;
}

export interface ThreatDragonDetailV2 {
  /** Contributors (required in V2 schema) */
  contributors: ContributorV2[];

  /** An array of one or more diagrams (required) */
  diagrams: DiagramV2[];

  /** Counter used to generate unique diagram IDs */
  diagramTop: number;

  /** Counter used to generate unique threat IDs */
  threatTop: number;

  /** The reviewer of the overall threat model */
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

  /** Methodology type: STRIDE, LINDDUN, CIA, DIE, PLOT4ai, Generic, ... */
  diagramType: string;

  /** Diagram description (optional) */
  description?: string;

  /** Placeholder text used when description is empty (optional) */
  placeholder?: string;

  /** The path to the thumbnail image for the diagram */
  thumbnail: string;

  /** Threat Dragon version used in the diagram */
  version: string;

  /** Diagram cells (required in V2) */
  cells: CellV2[];

  [k: string]: unknown;
}

/** Common point type (used for positions and vertices) */
export interface PointV2 {
  x: number;
  y: number;
  [k: string]: unknown;
}

/**
 * Cell definition (V2)
 * - Nodes typically have: position + size + ports (optional)
 * - Edges typically have: source + target + vertices (optional) + labels (optional)
 */
export interface CellV2 {
  id: string;

  /**
   * The visual shape type, e.g.:
   * - "process" | "actor" | "store" | "flow"
   * - "trust-boundary-curve" | "trust-boundary-box"
   * - "td-text-block"
   */
  shape: string;

  /** Z-index for layering elements */
  zIndex: number;

  /** Visual attributes (shape-dependent) */
  attrs?: Record<string, unknown>;

  /** Domain/business data (type/name/flags/threats) */
  data: CellDataV2;

  /** Visibility flag (commonly present in V2 files) */
  visible?: boolean;

  /** Node geometry */
  position?: PointV2;
  size?: { width: number; height: number; [k: string]: unknown };

  /** Edge geometry (for flows and boundary curves) */
  source?: EdgeEndV2;
  target?: EdgeEndV2;
  vertices?: PointV2[];
  connector?: string;

  /** Edge labels (commonly present for flows/boundaries) */
  labels?: EdgeLabelV2[];

  /** Ports (commonly present for nodes and used by edges via source.port/target.port) */
  ports?: PortsV2;

  /** Some V2 exports include width/height for edges too */
  width?: number;
  height?: number;

  [k: string]: unknown;
}

/** Source/target endpoint for edges */
export interface EdgeEndV2 {
  /**
   * For edges (flows): reference to a node cell id
   * Example: { cell: "<uuid>", port: "<uuid>" }
   */
  cell?: string;

  /** Port id at the endpoint (optional) */
  port?: string;

  /**
   * For boundary curves: coordinates can be used instead of cell reference
   * Example: { x: 820, y: 40 }
   */
  x?: number;
  y?: number;

  [k: string]: unknown;
}

/**
 * Edge label structure as seen in V2 models.
 * V2 labels can contain markup and positioning metadata.
 */
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

/** Ports definition used by V2 cells (nodes) */
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

/**
 * Threats in V2:
 * - In practice, threats are usually stored under cell.data.threats[]
 * - Schema variants may contain threatId or id; we allow both.
 */
export interface ThreatV2 {
  id?: string;
  threatId?: string;

  number?: number;

  title: string;
  status: "NA" | "Open" | "Mitigated" | string;

  severity: "Low" | "Medium" | "High" | "Critical" | string;

  /** Category depends on methodology (e.g., STRIDE categories, CIA categories, etc.) */
  type: string;

  description: string;
  mitigation: string;

  modelType?: string;
  score?: string;

  /** sometimes present in exported models */
  new?: boolean;

  [k: string]: unknown;
}

/** Base properties common across V2 cell data types */
export interface BaseCellDataV2 {
  /** Type identifier, e.g. tm.Process, tm.Actor, tm.Store, tm.Flow, tm.Boundary, tm.Text, tm.BoundaryBox */
  type: string;

  /** Display name */
  name: string;

  /** Optional description */
  description?: string;

  /** Out-of-scope flags */
  outOfScope?: boolean;
  reasonOutOfScope?: string;

  /** Flag whether there are open threats */
  hasOpenThreats: boolean;

  /** For boundaries */
  isTrustBoundary?: boolean;

  /** Associated threats */
  threats?: ThreatV2[];

  [k: string]: unknown;
}

/**
 * Discriminated union for common V2 cell data types.
 * Includes types seen in real models (e.g., tm.BoundaryBox, tm.Text).
 */
export type CellDataV2 =
  | ProcessDataV2
  | StoreDataV2
  | ActorDataV2
  | FlowDataV2
  | BoundaryDataV2
  | BoundaryBoxDataV2
  | TextBlockDataV2
  | (BaseCellDataV2 & { type: string }); // fallback for forward compatibility

export interface ProcessDataV2 extends BaseCellDataV2 {
  type: "tm.Process";
  handlesCardPayment?: boolean;
  handlesGoodsOrServices?: boolean;
  isWebApplication?: boolean;
  privilegeLevel?: string;

  /** present in some models */
  threatFrequency?: Record<string, number>;

  [k: string]: unknown;
}

export interface StoreDataV2 extends BaseCellDataV2 {
  type: "tm.Store";
  isALog?: boolean;
  isEncrypted?: boolean;
  isSigned?: boolean;
  storesCredentials?: boolean;
  storesInventory?: boolean;

  [k: string]: unknown;
}

export interface ActorDataV2 extends BaseCellDataV2 {
  type: "tm.Actor";
  providesAuthentication?: boolean;

  [k: string]: unknown;
}

export interface FlowDataV2 extends BaseCellDataV2 {
  type: "tm.Flow";
  isBidirectional?: boolean;
  isEncrypted?: boolean;
  isPublicNetwork?: boolean;
  protocol?: string;

  [k: string]: unknown;
}

export interface BoundaryDataV2 extends BaseCellDataV2 {
  type: "tm.Boundary";
  isTrustBoundary: boolean;

  [k: string]: unknown;
}

/** Appears in some V2 models for trust boundary boxes */
export interface BoundaryBoxDataV2 extends BaseCellDataV2 {
  type: "tm.BoundaryBox";
  isTrustBoundary: boolean;

  [k: string]: unknown;
}

/** Appears in some V2 models for free text blocks */
export interface TextBlockDataV2 extends BaseCellDataV2 {
  type: "tm.Text";
  [k: string]: unknown;
}

