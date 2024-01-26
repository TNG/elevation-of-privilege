import {
  faBolt,
  faEdit,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import type { FC } from 'react';
import nl2br from 'react-nl2br';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardText,
  Col,
  Collapse,
  ListGroup,
  ListGroupItem,
  Row,
} from 'reactstrap';
import confirm from 'reactstrap-confirm';
import { getSuitDisplayName } from '../../../utils/cardDefinitions';
import { getComponentName } from '../../../utils/utils';
import ThreatModal from '../threatmodal/threatmodal';
import './threatbar.css';
import type { GameState } from '../../../game/gameState';
import type { BoardProps } from 'boardgame.io/react';
import type { Threat } from '../../../game/threat';

type ThreatbarProps = {
  model?: Record<string, any>; // TODO: improve
  active: boolean;
  names: string[];
  isInThreatStage: boolean;
} & Pick<BoardProps<GameState>, 'G' | 'ctx' | 'moves' | 'playerID'>;

const Threatbar: FC<ThreatbarProps> = ({
  playerID,
  model,
  G,
  ctx,
  moves,
  active,
  names,
  isInThreatStage,
}) => {
  const getSelectedComponent = () => {
    if (G.selectedComponent === '' || model === undefined) {
      return null;
    }

    const diagram = model.detail.diagrams[G.selectedDiagram].diagramJson;
    for (let i = 0; i < diagram.cells.length; i++) {
      const cell = diagram.cells[i];
      if (cell.id === G.selectedComponent) {
        console.log("Cell:", cell);
        return cell;
      }
    }

    return null;
  };

  const getThreatsForSelectedComponent = (): Threat[] => {
    const threats: Threat[] = [];
    if (G.selectedComponent === '' || model === undefined) {
      return threats;
    }

    const diagram = model.detail.diagrams[G.selectedDiagram].diagramJson;
    for (let i = 0; i < diagram.cells.length; i++) {
      const cell = diagram.cells[i];
      if (G.selectedComponent !== '') {
        if (cell.id === G.selectedComponent) {
          if (Array.isArray(cell.threats)) {
            // fix threat ids
            for (let j = 0; j < cell.threats.length; j++) {
              if (!('id' in cell.threats[j])) {
                cell.threats[j].id = j + '';
              }
            }
            return cell.threats;
          }
        }
      } else {
        /*
        if (Array.isArray(cell.threats)) {
          threats = threats.concat(cell.threats);
        }
        */
      }
    }
    return threats;
  };

  const getIdentifiedThreatsForSelectedComponent = () => {
    const threats = [];
    if (G.selectedDiagram in G.identifiedThreats) {
      if (G.selectedComponent in G.identifiedThreats[G.selectedDiagram]) {
        for (const k in G.identifiedThreats[G.selectedDiagram][
          G.selectedComponent
        ]) {
          const t =
            G.identifiedThreats[G.selectedDiagram][G.selectedComponent][k];
          threats.push(t);
        }
      }
    }

    return threats;
  };

  const threats = getThreatsForSelectedComponent().reverse();
  const identifiedThreats =
    getIdentifiedThreatsForSelectedComponent().reverse();
  const component = getSelectedComponent();
  const componentName = getComponentName(component);

  return (
    <div className="threat-bar" hidden={G.selectedComponent === ''}>
      <Card>
        <CardHeader>
          Threats for {componentName}{' '}
          {/* @ts-expect-error @fortawesome/react-fontawesome uses an older version of @fortawesome/fontawesome-svg-core (1.3.0), which makes the types incompatible. It still works correctly at runtime. */}
          <FontAwesomeIcon style={{ float: 'right' }} icon={faBolt} />
        </CardHeader>
        <CardBody className="threat-container">
          {playerID && (
            <Button
              color="primary"
              size="lg"
              block
              disabled={
                G.selectedComponent === '' ||
                !isInThreatStage ||
                G.passed.includes(playerID) ||
                !active
              }
              onClick={() => moves.toggleModal()}
            >
              {/* @ts-expect-error @fortawesome/react-fontawesome uses an older version of @fortawesome/fontawesome-svg-core (1.3.0), which makes the types incompatible. It still works correctly at runtime. */}
              <FontAwesomeIcon icon={faPlus} /> Add Threat
            </Button>
          )}
          <div hidden={component !== null && component.type !== 'tm.Flow'}>
            <hr />
            <Card>
              <CardHeader>Flow Data Elements</CardHeader>
              <ListGroup flush>
                {component !== null &&
                  Array.isArray(component.dataElements) &&
                  component.dataElements.map((val: any, idx: number) => {
                    console.log("data elements: ", val, idx);
                    return (
                      <ListGroupItem className="thin-list-group-item" key={idx}>
                        {val}
                      </ListGroupItem>
                    );
                  })}
                {component !== null && !Array.isArray(component.dataElements) && (
                  <ListGroupItem>
                    <em>No data elements defined</em>
                  </ListGroupItem>
                )}
              </ListGroup>
            </Card>
          </div>
          <hr />
          {identifiedThreats.map((val, idx) => (
            <Card key={idx}>
              <CardHeader
                className="hoverable"
                onClick={() => moves.selectThreat(val.id)}
              >
                <strong>{val.title}</strong>
                <Row>
                  <Col xs="6">
                    <small>
                      {val.type !== undefined
                        ? getSuitDisplayName(G.gameMode, val.type)
                        : ''}
                    </small>
                  </Col>
                  <Col xs="3">
                    <small>{val.severity}</small>
                  </Col>
                  <Col xs="3">
                    <small className="float-right">
                      &mdash;{' '}
                      {val.owner !== undefined
                        ? names[Number.parseInt(val.owner)]
                        : ''}
                    </small>
                  </Col>
                </Row>
              </CardHeader>
              <Collapse isOpen={G.selectedThreat === val.id}>
                <CardBody>
                  <CardText>{nl2br(val.description)}</CardText>
                  <hr />
                  <CardText>{nl2br(val.mitigation)}</CardText>
                </CardBody>
                <CardFooter hidden={val.owner !== playerID}>
                  <Row>
                    <Col xs="6">
                      <Button
                        block
                        onClick={() => moves.toggleModalUpdate(val)}
                      >
                        {/* @ts-expect-error @fortawesome/react-fontawesome uses an older version of @fortawesome/fontawesome-svg-core (1.3.0), which makes the types incompatible. It still works correctly at runtime. */}
                        <FontAwesomeIcon icon={faEdit} /> Update
                      </Button>
                    </Col>
                    <Col xs="6">
                      <Button
                        block
                        color="danger"
                        onClick={() =>
                          confirm().then((result) => {
                            if (result) {
                              moves.deleteThreat(val);
                            }
                          })
                        }
                      >
                        {/* @ts-expect-error @fortawesome/react-fontawesome uses an older version of @fortawesome/fontawesome-svg-core (1.3.0), which makes the types incompatible. It still works correctly at runtime. */}
                        <FontAwesomeIcon icon={faTrash} /> Remove
                      </Button>
                    </Col>
                  </Row>
                </CardFooter>
              </Collapse>
            </Card>
          ))}
          {identifiedThreats.length <= 0 && (
            <em className="text-muted">
              No threats identified for this component yet.
            </em>
          )}
          <hr />
          {threats.map((val: Threat, idx: number) => (
            <Card key={idx}>
              <CardHeader
                className="hoverable"
                onClick={() => moves.selectThreat(val.id)}
              >
                <strong>{val.title}</strong>
                <Row>
                  <Col xs="6">
                    <small>{val.type}</small>
                  </Col>
                  <Col xs="3">
                    <small>{val.severity}</small>
                  </Col>
                  <Col xs="3">
                    <small className="float-right">
                      &mdash;{' '}
                      {typeof val.owner !== 'undefined' ? val.owner : 'NA'}
                    </small>
                  </Col>
                </Row>
              </CardHeader>
              <Collapse isOpen={G.selectedThreat === val.id}>
                <CardBody>
                  <CardText>{nl2br(val.description)}</CardText>
                  <hr />
                  <CardText>{nl2br(val.mitigation)}</CardText>
                </CardBody>
              </Collapse>
            </Card>
          ))}
          {threats.length <= 0 && (
            <em className="text-muted">
              No existing threats for this component.
            </em>
          )}
        </CardBody>
      </Card>
      <ThreatModal
        isOpen={G.threat.modal}
        G={G}
        ctx={ctx}
        playerID={playerID}
        moves={moves}
        names={names}
      />
    </div>
  );
};

export default Threatbar;
