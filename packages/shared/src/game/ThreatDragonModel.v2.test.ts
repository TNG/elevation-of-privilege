import { describe, it, expect } from 'vitest';

import { v2Adapter } from './ThreatDragonModel.v2';
import type { CellV2, ThreatDragonModelV2 } from './ThreatDragonModel.v2';
import type { ThreatDragonThreat } from './ThreatDragonModel';

const actorCell: CellV2 = {
  id: 'actor-1',
  shape: 'actor',
  zIndex: 1,
  position: { x: 10, y: 20 },
  size: { width: 100, height: 80 },
  attrs: { text: { text: 'Browser' } },
  data: {
    type: 'tm.Actor',
    name: 'Browser',
    hasOpenThreats: false,
    threats: [],
  },
};

const flowCell: CellV2 = {
  id: 'flow-1',
  shape: 'flow',
  zIndex: 5,
  attrs: {
    line: { stroke: '#333', strokeWidth: 1, targetMarker: { name: 'block' } },
  },
  source: { cell: 'actor-1' },
  target: { cell: 'process-1' },
  vertices: [{ x: 100, y: 50 }],
  connector: 'smooth',
  labels: [
    {
      position: { distance: 0.5 },
      attrs: { labelText: { text: 'Web Request' } },
    },
  ],
  data: {
    type: 'tm.Flow',
    name: 'Web Request',
    hasOpenThreats: false,
    isEncrypted: true,
    isPublicNetwork: true,
    protocol: 'HTTP/S',
  },
};

const boundaryBoxCell: CellV2 = {
  id: 'bb-1',
  shape: 'trust-boundary-box',
  zIndex: 0,
  position: { x: 0, y: 0 },
  size: { width: 200, height: 200 },
  attrs: {},
  data: {
    type: 'tm.BoundaryBox',
    name: 'Boundary',
    hasOpenThreats: false,
    isTrustBoundary: true,
  },
};

const model: ThreatDragonModelV2 = {
  version: '2.0.0',
  summary: { title: 'Test V2' },
  detail: {
    contributors: [],
    diagrams: [
      {
        id: 0,
        title: 'Main',
        diagramType: 'STRIDE',
        thumbnail: '',
        version: '2.0.0',
        cells: [actorCell, flowCell, boundaryBoxCell],
      },
    ],
    diagramTop: 1,
    threatTop: 0,
    reviewer: '',
  },
};

describe('v2Adapter', () => {
  describe('getDiagramCells', () => {
    it('returns cells for an existing diagram', () => {
      expect(v2Adapter.getDiagramCells(model, 0)).toHaveLength(3);
    });

    it('returns undefined for a missing diagram', () => {
      expect(v2Adapter.getDiagramCells(model, 99)).toBeUndefined();
    });
  });

  describe('findCell', () => {
    it('finds a cell by id', () => {
      expect(v2Adapter.findCell(model, 0, 'actor-1')?.id).toBe('actor-1');
    });

    it('returns undefined for a missing cell', () => {
      expect(v2Adapter.findCell(model, 0, 'nope')).toBeUndefined();
    });
  });

  describe('getCellThreats', () => {
    it('reads threats from data.threats', () => {
      const cell: CellV2 = {
        ...actorCell,
        data: {
          type: 'tm.Actor',
          name: 'X',
          hasOpenThreats: true,
          threats: [
            {
              title: 't',
              status: 'Open',
              severity: 'High',
              description: '',
              mitigation: '',
              type: 'x',
            },
          ],
        },
      };
      expect(v2Adapter.getCellThreats(cell)).toHaveLength(1);
    });

    it('falls back to cell.threats if data.threats is absent', () => {
      const cell = {
        id: 'x',
        shape: 'actor',
        zIndex: 0,
        threats: [
          {
            title: 't',
            status: 'Open',
            severity: 'High',
            description: '',
            mitigation: '',
            type: 'x',
          },
        ],
        data: { type: 'tm.Actor', name: 'X', hasOpenThreats: false },
      } as unknown as CellV2;
      expect(v2Adapter.getCellThreats(cell)).toHaveLength(1);
    });

    it('returns empty array when no threats anywhere', () => {
      expect(v2Adapter.getCellThreats(actorCell)).toEqual([]);
    });
  });

  describe('setCellThreats', () => {
    it('writes threats to data.threats and recomputes hasOpenThreats', () => {
      const cell: CellV2 = {
        ...actorCell,
        data: { type: 'tm.Actor', name: 'X', hasOpenThreats: false },
      };
      const t: ThreatDragonThreat = {
        title: 't',
        status: 'Open',
        severity: 'High',
        description: '',
        mitigation: '',
        type: 'x',
      };
      v2Adapter.setCellThreats(cell, [t]);
      expect(cell.data.threats).toHaveLength(1);
      expect(cell.data.hasOpenThreats).toBe(true);
    });

    it('preserves hasOpenThreats=true when adding Mitigated threat to already-open cell', () => {
      const cell: CellV2 = {
        ...actorCell,
        data: { type: 'tm.Actor', name: 'X', hasOpenThreats: true },
      };
      const t: ThreatDragonThreat = {
        title: 't',
        status: 'Mitigated',
        severity: 'High',
        description: '',
        mitigation: '',
        type: 'x',
      };
      v2Adapter.setCellThreats(cell, [t]);
      expect(cell.data.hasOpenThreats).toBe(true);
    });

    it('initializes data if absent', () => {
      const cell = {
        id: 'x',
        shape: 'actor',
        zIndex: 0,
      } as unknown as CellV2;
      v2Adapter.setCellThreats(cell, []);
      expect(cell.data).toBeDefined();
      expect(cell.data.threats).toEqual([]);
    });
  });

  describe('getComponentName', () => {
    it('returns empty for undefined', () => {
      expect(v2Adapter.getComponentName(undefined)).toBe('');
    });

    it('returns name for actor from data.name', () => {
      expect(v2Adapter.getComponentName(actorCell)).toBe('Actor: Browser');
    });

    it('returns name for flow from labelText', () => {
      expect(v2Adapter.getComponentName(flowCell)).toBe('Flow: Web Request');
    });

    it('falls back to data.name for flow if no label', () => {
      const cell: CellV2 = {
        ...flowCell,
        labels: [],
      };
      expect(v2Adapter.getComponentName(cell)).toBe('Flow: Web Request');
    });
  });

  describe('toJointGraph', () => {
    it('adapts V2 cells to JointJS shape', () => {
      const graph = v2Adapter.toJointGraph(model, 0);
      expect(graph.cells).toHaveLength(3);

      const actor = graph.cells[0] as Record<string, unknown>;
      expect(actor.type).toBe('tm.Actor');
      expect(actor.z).toBe(1);
      expect(actor.position).toEqual({ x: 10, y: 20 });
      expect(actor.size).toEqual({ width: 100, height: 80 });
      expect((actor.attrs as { text: { text: string } }).text.text).toBe(
        'Browser',
      );
      expect(actor.threats).toEqual([]);
    });

    it('maps flow edges with source.id / target.id / smooth', () => {
      const graph = v2Adapter.toJointGraph(model, 0);
      const flow = graph.cells[1] as Record<string, unknown>;
      expect(flow.type).toBe('tm.Flow');
      expect((flow.source as { id: string }).id).toBe('actor-1');
      expect((flow.target as { id: string }).id).toBe('process-1');
      expect(flow.smooth).toBe(true);
      expect(flow.vertices).toEqual([{ x: 100, y: 50 }]);
    });

    it('maps tm.BoundaryBox to tm.Boundary', () => {
      const graph = v2Adapter.toJointGraph(model, 0);
      const boundary = graph.cells[2] as Record<string, unknown>;
      expect(boundary.type).toBe('tm.Boundary');
    });

    it('maps data.threats to top-level threats on JointJS cell', () => {
      const cellWithThreats: CellV2 = {
        ...actorCell,
        data: {
          type: 'tm.Actor',
          name: 'X',
          hasOpenThreats: true,
          threats: [
            {
              title: 't',
              status: 'Open',
              severity: 'High',
              description: '',
              mitigation: '',
              type: 'x',
            },
          ],
        },
      };
      const m: ThreatDragonModelV2 = {
        ...model,
        detail: {
          ...model.detail,
          diagrams: [
            {
              ...model.detail.diagrams[0]!,
              cells: [cellWithThreats],
            },
          ],
        },
      };
      const graph = v2Adapter.toJointGraph(m, 0);
      const cell = graph.cells[0] as Record<string, unknown>;
      expect(cell.threats).toHaveLength(1);
    });

    it('returns empty cells for missing diagram', () => {
      expect(v2Adapter.toJointGraph(model, 99).cells).toEqual([]);
    });
  });

  describe('validate', () => {
    it('accepts a valid V2 model', () => {
      expect(v2Adapter.validate(model).valid).toBe(true);
    });

    it('rejects non-object', () => {
      expect(v2Adapter.validate(null).valid).toBe(false);
    });

    it('rejects missing version', () => {
      const m = { ...model } as Record<string, unknown>;
      delete m.version;
      expect(v2Adapter.validate(m).valid).toBe(false);
    });

    it('rejects missing diagramTop', () => {
      const m = { ...model, detail: { ...model.detail } } as Record<
        string,
        unknown
      >;
      delete (m.detail as Record<string, unknown>).diagramTop;
      expect(v2Adapter.validate(m).valid).toBe(false);
    });

    it('rejects diagram without cells array', () => {
      expect(
        v2Adapter.validate({
          version: '2.0.0',
          summary: { title: 'x' },
          detail: {
            contributors: [],
            diagrams: [
              { id: 0, title: '', diagramType: '', thumbnail: '', version: '' },
            ],
            diagramTop: 1,
            threatTop: 0,
            reviewer: '',
          },
        }).valid,
      ).toBe(false);
    });
  });
});
