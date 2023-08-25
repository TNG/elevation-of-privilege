export type ThreatDragonModel = {
  summary: {
    description?: string;
    id?: number;
    owner?: string;
    tdVersion?: string;
    title: string;
  };
  detail: {
    contributors?: Contributor[];
    diagrams: Diagram[];
  };
};

interface Contributor {
  name: string;
}

interface Size {
  width: number;
  height: number;
}

interface Diagram {
  diagramJson: DiagramJson;
  diagramType?: string;
  id: number;
  thumbnail?: string;
  title?: string;
  size?: Size;
  $$hashKey?: string;
}

interface DiagramJson {
  cells: Cell[];
}

type CellType =
  | 'tm.Process'
  | 'tm.Store'
  | 'tm.Actor'
  | 'tm.Flow'
  | 'tm.Boundary';

interface Position {
  x: number;
  y: number;
}

interface Cell {
  type: CellType;
  size: Size;
  position: Position;
  angle: number;
  z: number;
  attrs: Record<string, Record<string, string>>;
  id: string;
  hasOpenThreats: boolean;
  threats?: ThreatDragonThreat[];
}

type Status = 'Open' | 'Mitigated';

export interface ThreatDragonThreat {
  status: Status;
  severity?: string;
  mitigation?: string;
  description?: string;
  owner?: string;
  title?: string;
  type?: string;

  // our custom properties
  id?: string;
  methodology?: string;
  game?: string;
}
