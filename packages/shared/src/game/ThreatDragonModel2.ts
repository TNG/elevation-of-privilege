/**
 * The threat models used by OWASP Threat Dragon
 *
 * This type is based on the schema at https://owasp.org/www-project-threat-dragon/assets/schemas/owasp.threat-dragon.schema.V1.json
 */

export interface ThreatDragonModel2 {
    summary: Summary
    detail: Detail
    version: string
  }
  
export interface Summary {
    title: string
    owner: string
    description: string
    id: number
  }
  
export interface Detail {
    contributors: Contributor[]
    diagrams: Diagram[]
    reviewer: string
    diagramTop: number
    threatTop: number
  }
  
export interface Contributor {
    name: string
  }
  
export interface Diagram {
    cells: Cell[]
    version: string
    title: string
    thumbnail: string
    id: number
  }
  
export interface Cell {
    position?: {
      /**
       * The component horizontal position
       */
      x: number;
      /**
       * The component vertical position
       */
      y: number;
      [k: string]: unknown;
    };
    size?: {
      /**
       * The component height
       */
      height: number;
      /**
       * The component width
       */
      width: number;
    };
    attrs?: Attrs
    visible?: boolean
    shape: string
    zIndex: number
    id: string
    data: Data
    width?: number
    height?: number
    connector?: string
    labels?: Label[]
    source?: Source
    target?: Target
    vertices?: {
      /**
       * The horizontal value of the curve point
       */
      x: number;
      /**
       * The vertical value of the curve point
       */
      y: number;
    };
  }
  
export interface Position {
    x: number
    y: number
  }
  
export interface Size {
    width: number
    height: number
  }
  
export interface Attrs {
    line?: Line
    text?: Text
    topLine?: TopLine
    bottomLine?: BottomLine
    body?: Body
  }
  
export interface Line {
    stroke: string
    strokeWidth?: number
    targetMarker: TargetMarker
    sourceMarker: SourceMarker
    strokeDasharray?: string
  }
  
export interface TargetMarker {
    name: string
  }
  
export interface SourceMarker {
    name: string
  }
  
export interface Text {
    text: string
  }
  
export interface TopLine {
    stroke: string
    strokeWidth: number
    strokeDasharray: any
  }
  
export interface BottomLine {
    stroke: string
    strokeWidth: number
    strokeDasharray: any
  }
  
export interface Body {
    stroke: string
    strokeWidth: number
    strokeDasharray: any
  }
  
export interface Data {
    name: string
    description: string
    type: CellType
    isTrustBoundary: boolean
    outOfScope?: boolean
    reasonOutOfScope?: string
    threats?: Threat[]
    hasOpenThreats: boolean
    isALog?: boolean
    storesCredentials?: boolean
    isEncrypted?: boolean
    isSigned?: boolean
    providesAuthentication?: boolean
    isBidirectional?: boolean
    isPublicNetwork?: boolean
    protocol?: string
  }
  
export interface Threat {
    status: Status
    severity: string
    title: string
    type: string
    description: string
    mitigation: string
    modelType: string
    id: string
  }
  
export interface Label {
     /**
   * The label position
   */
  position: number;
  /**
   * The label text attributes
   */
  attrs: {
    /**
     * The text attributes
     */
    label: {
      /**
       * The text size
       */
      // 'font-size': string;
      /**
       * The text weight
       */
      // 'font-weight': string;
      /**
       * The text content
       */
      text: string;
    };
  };
  }
  
export interface Attrs2 {
    label: Label2
  }
  
export interface Label2 {
    text: string
  }
  
export interface Source {
    x?: number
    y?: number
    cell?: string
  }
  
export interface Target {
    x?: number
    y?: number
    cell?: string
  }
  
export interface Vertex {
    x: number
    y: number
  }
 export type CellType =
  | 'tm.Process'
  | 'tm.Store'
  | 'tm.Actor'
  | 'tm.Flow'
  | 'tm.Boundary'
  | 'tm.BoundaryBox';
  
type Status = 'NA' | 'Open' | 'Mitigated';
