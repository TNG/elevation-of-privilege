import classnames from 'classnames';
import * as joint from 'jointjs';
import React, {FC, useCallback, useEffect, useState} from 'react';
import {Nav, NavItem, NavLink} from 'reactstrap';

import 'jointjs/dist/joint.css';

import '../../jointjs/joint-tm.css';
import '../../jointjs/shapes';

import './model.css';

import type {CellV2, DiagramV2, ThreatDragonModelV2} from '@eop/shared';

const SCROLL_SPEED = 1000;

type ModelProps = {
  model: ThreatDragonModelV2;
  selectedDiagram: number;
  selectedComponent: string;
  onSelectDiagram?: (id: number) => void;
  onSelectComponent?: (id: string) => void;
};

const Model: FC<ModelProps> = ({
                                 model,
                                 selectedDiagram,
                                 selectedComponent,
                                 onSelectDiagram,
                                 onSelectComponent,
                               }) => {
  const [graph] = useState(
    new joint.dia.Graph({}, { cellNamespace: joint.shapes }),
  );

  const createPaper = useCallback(
    (el?: HTMLElement) =>
      new joint.dia.Paper({
        el,
        width: window.innerWidth,
        height: window.innerHeight,
        model: graph,
        interactive: false,
        gridSize: 10,
        drawGrid: true,
      }),
    [graph],
  );

  const [paper, setPaper] = useState(createPaper());

  const placeholderRef = useCallback(
    (el: HTMLElement | null) => {
      if (el !== null) {
        setPaper(createPaper(el));
      }
    },
    [createPaper],
  );

  const [dragging, setDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const diagram = model.detail.diagrams[selectedDiagram];
    if (!diagram) {
      graph.clear();
      return;
    }
    const jointJson = toJointGraphJson(diagram);
    graph.fromJSON(jointJson);

    // paper.fitToContent(1, 1, 10, { allowNewOrigin: 'any' });
  }, [graph, model, selectedDiagram]);

  useEffect(() => {
    // unhighlight all
    paper.model.getElements().forEach((e) => {
      const v = paper.findViewByModel(e);
      v?.unhighlight();
    });
    paper.model.getLinks().forEach((e) => {
      const v = paper.findViewByModel(e);
      v?.unhighlight();
    });

    // highlight the selected component
    const selectedComponentView = paper.findViewByModel(selectedComponent);
    if (selectedComponentView) {
      selectedComponentView.highlight();
    }
  }, [paper, selectedComponent]);

  /**
   * Selection + panning interaction
   */
  useEffect(() => {
    const onCellPointerClick = (cellView: joint.dia.CellView) => {
      if (cellView.model.attributes.type !== 'tm.Boundary') {
        onSelectComponent?.(cellView.model.id.toString());
      }
    };

    const onBlankPointerClick = () => {
      onSelectComponent?.('');
    };

    const setDragPositionScaled = (x: number, y: number) => {
      const scale = joint.V(paper.layers).scale();
      setDragPosition({ x: x * scale.sx, y: y * scale.sy });
    };

    const onBlankPointerDown = (event: joint.dia.Event, x: number, y: number) => {
      setDragging(true);
      setDragPositionScaled(x, y);
    };

    const stopDragging = (x: number, y: number) => {
      setDragging(false);
      setDragPositionScaled(x, y);
    };

    const onCellPointerUp = (cellView: joint.dia.CellView, event: joint.dia.Event, x: number, y: number) => {
      stopDragging(x, y);
    };

    const onBlankPointerUp = (event: joint.dia.Event, x: number, y: number) => {
      stopDragging(x, y);
    };

    paper.on('cell:pointerclick', onCellPointerClick);
    paper.on('blank:pointerclick', onBlankPointerClick);
    paper.on('blank:pointerdown', onBlankPointerDown);
    paper.on('cell:pointerup', onCellPointerUp);
    paper.on('blank:pointerup', onBlankPointerUp);

    return () => {
      paper.off('cell:pointerclick', onCellPointerClick);
      paper.off('blank:pointerclick', onBlankPointerClick);
      paper.off('blank:pointerdown', onBlankPointerDown);
      paper.off('cell:pointerup', onCellPointerUp);
      paper.off('blank:pointerup', onBlankPointerUp);
    };
  }, [paper, onSelectComponent]);

  const mouseWheel = useCallback(
    ({ nativeEvent: e }: React.WheelEvent) => {
      const delta = -e.deltaY / SCROLL_SPEED;
      const newScale = joint.V(paper.layers).scale().sx + delta;
      paper.translate(0, 0);

      const p = offsetToLocalPoint(e.offsetX, e.offsetY, paper);
      paper.scale(newScale, newScale, p.x, p.y);
    },
    [paper],
  );

  const mouseMove = useCallback(
    ({ nativeEvent: e }: React.MouseEvent) => {
      if (dragging) {
        const x = e.offsetX;
        const y = e.offsetY;
        paper.translate(x - dragPosition.x, y - dragPosition.y);
      }
    },
    [dragging, paper, dragPosition.x, dragPosition.y],
  );

  return (
    <div className="model">
      <div>
        <title>EoP - {model.summary.title}</title>
        <h1 style={{ padding: '10px 15px' }}>{model.summary.title}</h1>
        <Nav tabs>
          {model.detail.diagrams.map((d, idx) => (
            <NavItem key={idx}>
              <NavLink
                className={classnames({
                  active: selectedDiagram === idx,
                })}
                onClick={() => onSelectDiagram?.(idx)}
              >
                {d.title}
              </NavLink>
            </NavItem>
          ))}
        </Nav>
      </div>

      <div
        className="placeholder"
        ref={placeholderRef}
        onMouseMove={mouseMove}
        onWheel={mouseWheel}
      />
    </div>
  );
};

export default Model;

const offsetToLocalPoint = (
  offsetX: number,
  offsetY: number,
  paper: joint.dia.Paper,
) => {
  const svgPoint = paper.svg.createSVGPoint();
  svgPoint.x = offsetX;
  svgPoint.y = offsetY;
  return svgPoint.matrixTransform(
    paper.layers.getCTM()?.inverse(),
  );
};

/* =============================================================================
   Helper: Threat Dragon V2 -> JointJS Graph JSON
   ============================================================================= */

/**
 * Threat Dragon V2 uses diagram.cells[] with shape/zIndex/data.type and
 * edge endpoints source.cell/target.cell. We map that into JointJS-compatible
 * JSON cells (type/z/source.id/target.id etc.). [1](https://owasp.org/www-project-threat-dragon/assets/schemas/owasp.threat-dragon.schema.V2.json)[2](https://deepwiki.com/OWASP/threat-dragon/2.1-threat-model-data-structure)
 */

type JointAttrs = Record<string, unknown>;

type JointEdgeEnd =
  | { id: string; port?: string }
  | { x: number; y: number }
  | Record<string, never>;

type JointLabel = {
  position: number;
  attrs: {
    text: { text: string };
  };
};

type JointCellBase = {
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
};

type JointNodeCell = JointCellBase & {
  position: { x: number; y: number };
  size: { width: number; height: number };
};

type JointEdgeCell = JointCellBase & {
  source: JointEdgeEnd;
  target: JointEdgeEnd;
  vertices: Array<{ x: number; y: number }>;
  smooth?: boolean;
  labels?: JointLabel[];

  isBidirectional?: boolean;
  isEncrypted?: boolean;
  isPublicNetwork?: boolean;
  protocol?: string;
};

type JointCell = JointNodeCell | JointEdgeCell;

function toJointGraphJson(diagram: DiagramV2): { cells: JointCell[] } {
  const cells = (diagram.cells ?? [])
    .map(v2CellToJointCell)
    .filter((c): c is JointCell => c !== null);

  return { cells };
}

function v2CellToJointCell(cell: CellV2): JointCell | null {
  const dataType = cell.data?.type; // e.g. "tm.Process"
  const shape = cell.shape;

  // Base mapping
  const base: JointCellBase = {
    id: cell.id,
    type: mapToJointType(shape, dataType),
    z: cell.zIndex ? cell.zIndex : 0,
    attrs: normalizeAttrs(cell),
  };

  // Node cells: position + size
  if (cell.position && cell.size) {
    return {
      ...base,
      position: {x: cell.position.x, y: cell.position.y},
      size: {width: cell.size.width, height: cell.size.height},

      description: cell.data?.description ?? '',
      hasOpenThreats: !!cell.data?.hasOpenThreats,
      outOfScope: !!cell.data?.outOfScope,
      reasonOutOfScope: cell.data?.reasonOutOfScope ?? '',
      isTrustBoundary: !!cell.data?.isTrustBoundary,
      threats: cell.data?.threats ?? [],
      visible: typeof cell.visible === 'boolean' ? cell.visible : undefined,
    };
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

      smooth: typeof cell.connector === 'string' ? cell.connector === 'smooth' : undefined,

      description: cell.data?.description ?? '',
      hasOpenThreats: !!cell.data?.hasOpenThreats,
      outOfScope: !!cell.data?.outOfScope,
      reasonOutOfScope: cell.data?.reasonOutOfScope ?? '',
      isTrustBoundary: !!cell.data?.isTrustBoundary,
      threats: cell.data?.threats ?? [],
      visible: typeof cell.visible === 'boolean' ? cell.visible : undefined,
    };

    // Copy edge labels best-effort
    const labels = mapEdgeLabels(cell);
    if (labels.length) edge.labels = labels;

    // If flow flags exist in data, put them at root too (optional, but helps if your UI reads them)
    if (cell.data?.type === 'tm.Flow') {
      const d = cell.data;
      edge.isBidirectional = !!d.isBidirectional;
      edge.isEncrypted = !!d.isEncrypted;
      edge.isPublicNetwork = !!d.isPublicNetwork;
      edge.protocol = typeof d.protocol === 'string' ? d.protocol : '';
    }

    return edge;
  }

  return null;
}

function mapToJointType(shape: string, dataType?: string): string {
  // Prefer the semantic Threat Dragon type if present
  if (typeof dataType === 'string' && dataType.startsWith('tm.')) {
    // V2 extra: tm.BoundaryBox -> map to tm.Boundary so existing selection logic works
    if (dataType === 'tm.BoundaryBox') return 'tm.Boundary';

    // V2 extra: tm.Text blocks. If you don't have a tm.Text shape,
    // we map it to tm.Process so it still renders (as a basic element).
    if (dataType === 'tm.Text') return 'tm.Process';

    return dataType;
  }

  // Fallback based on shape
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

  // boundary curves may use x/y endpoints
  if (typeof end.x === 'number' && typeof end.y === 'number') {
    return { x: end.x, y: end.y };
  }

  // flows use cell/port in V2; map to JointJS id/port
  if (typeof end.cell === 'string') {
    return { id: end.cell, port: typeof end.port === 'string' ? end.port : undefined };
  }

  return {};
}

/**
 * Normalize V2 attrs to something that your existing JointJS shapes can render.
 * We keep original attrs, but ensure attrs.text.text contains the element label.
 */
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
  // Prefer business name
  if (typeof cell.data?.name === 'string' && cell.data.name.trim()) {
    return cell.data.name;
  }

  // Common V2 patterns
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

    // Prefer labelText.text; fallback to label.text
    const labelText = (attrs as { labelText?: { text?: unknown } }).labelText?.text;
    const fallback = (attrs as { label?: { text?: unknown } }).label?.text;

    const text =
      (typeof labelText === 'string' && labelText.trim())
        ? labelText
        : (typeof fallback === 'string' ? fallback : '');

    if (!text || !text.trim()) continue;

    out.push({
      position: typeof l.position?.distance === 'number' ? l.position.distance : 0.5,
      attrs: {
        text: { text },
      },
    });
  }

  return out;
}
