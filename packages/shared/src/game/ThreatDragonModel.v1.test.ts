import { describe, it, expect } from 'vitest';

import { v1Adapter } from './ThreatDragonModel.v1';
import type {
  ThreatDragonComponentV1,
  ThreatDragonModelV1,
} from './ThreatDragonModel.v1';
import type { ThreatDragonThreat } from './ThreatDragonModel';

const actorCell: ThreatDragonComponentV1 = {
  type: 'tm.Actor',
  attrs: { text: { text: 'Bar' } },
  id: 'some-id',
  size: { width: 0, height: 0 },
  z: 0,
};

const flowCell: ThreatDragonComponentV1 = {
  type: 'tm.Flow',
  labels: [
    {
      attrs: {
        text: {
          text: 'Bar',
          'font-size': '12pt',
          'font-weight': 'bold',
        },
      },
      position: 0,
    },
  ],
  attrs: {},
  id: 'some-id',
  size: { width: 0, height: 0 },
  z: 0,
};

const model: ThreatDragonModelV1 = {
  summary: { title: 'Test' },
  detail: {
    diagrams: [
      {
        id: 0,
        title: 'Diagram 0',
        diagramType: 'STRIDE',
        thumbnail: '',
        size: { width: 0, height: 0 },
        diagramJson: {
          cells: [actorCell, flowCell],
        },
      },
    ],
  },
};

describe('v1Adapter', () => {
  describe('getDiagramCells', () => {
    it('returns cells for an existing diagram', () => {
      expect(v1Adapter.getDiagramCells(model, 0)).toHaveLength(2);
    });

    it('returns undefined for a missing diagram', () => {
      expect(v1Adapter.getDiagramCells(model, 99)).toBeUndefined();
    });
  });

  describe('findCell', () => {
    it('finds a cell by id', () => {
      expect(v1Adapter.findCell(model, 0, 'some-id')?.id).toBe('some-id');
    });

    it('returns undefined for a missing cell', () => {
      expect(v1Adapter.findCell(model, 0, 'nope')).toBeUndefined();
    });
  });

  describe('getCellThreats / setCellThreats', () => {
    it('reads threats from cell.threats', () => {
      const cell: ThreatDragonComponentV1 = {
        ...actorCell,
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
      };
      expect(v1Adapter.getCellThreats(cell)).toHaveLength(1);
    });

    it('returns empty array when no threats', () => {
      expect(v1Adapter.getCellThreats(actorCell)).toEqual([]);
    });

    it('writes threats to cell.threats', () => {
      const cell: ThreatDragonComponentV1 = { ...actorCell };
      const t: ThreatDragonThreat = {
        title: 't',
        status: 'Open',
        severity: 'High',
        description: '',
        mitigation: '',
        type: 'x',
      };
      v1Adapter.setCellThreats(cell, [t]);
      expect(cell.threats).toHaveLength(1);
      expect(cell.threats?.[0]?.title).toBe('t');
    });
  });

  describe('getComponentName', () => {
    it('returns empty for undefined', () => {
      expect(v1Adapter.getComponentName(undefined)).toBe('');
    });

    it('returns name for actor', () => {
      expect(v1Adapter.getComponentName(actorCell)).toBe('Actor: Bar');
    });

    it('returns name for flow from labels', () => {
      expect(v1Adapter.getComponentName(flowCell)).toBe('Flow: Bar');
    });
  });

  describe('toJointGraph', () => {
    it('returns diagramJson as-is (already JointJS-shaped)', () => {
      const graph = v1Adapter.toJointGraph(model, 0);
      expect(graph.cells).toHaveLength(2);
      expect(graph.cells?.[0]).toBe(actorCell);
    });

    it('returns empty cells for missing diagram', () => {
      expect(v1Adapter.toJointGraph(model, 99).cells).toEqual([]);
    });
  });

  describe('validate', () => {
    it('accepts a valid V1 model', () => {
      expect(v1Adapter.validate(model).valid).toBe(true);
    });

    it('rejects non-object', () => {
      expect(v1Adapter.validate(null).valid).toBe(false);
    });

    it('rejects missing summary.title', () => {
      expect(v1Adapter.validate({ detail: { diagrams: [] } }).valid).toBe(
        false,
      );
    });

    it('rejects missing diagramJson', () => {
      expect(
        v1Adapter.validate({
          summary: { title: 'x' },
          detail: { diagrams: [{ id: 0 }] },
        }).valid,
      ).toBe(false);
    });
  });
});
