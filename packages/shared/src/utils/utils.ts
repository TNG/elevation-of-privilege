import type { PlayerID } from 'boardgame.io';
import type { GameState } from '../game/gameState';
import type { Card, Suit } from './cardDefinitions';
import { ModelType } from './constants';
import type { ThreatDragonComponent, ThreatDragonModel } from '../game/ThreatDragonModel';
import type { ThreatDragonModel2 ,CellType} from '../game/ThreatDragonModel2';


export function getDealtCard(G: GameState): string {
  if (G.dealt.length > 0 && G.dealtBy) {
    return G.dealt[Number.parseInt(G.dealtBy)] ?? '';
  }
  return '';
}

export function resolvePlayerNames(
  players: PlayerID[],
  names: string[],
  current: PlayerID | null,
): string[] {
  const resolved = [];
  for (let i = 0; i < players.length; i++) {
    const c = Number.parseInt(players[i]);
    resolved.push(
      current !== null && c === Number.parseInt(current) ? 'You' : names[c],
    );
  }
  return resolved;
}

export function resolvePlayerName(
  player: PlayerID,
  names: string[],
  current: PlayerID | null,
): string {
  return current !== null &&
    Number.parseInt(player) === Number.parseInt(current)
    ? 'You'
    : names[Number.parseInt(player)];
}

export function grammarJoin(arr: string[]): string | undefined {
  const last = arr.pop();

  if (arr.length <= 0) return last;

  return arr.join(', ') + ' and ' + last;
}

export function getPlayers(count: number): string[] {
  const players = [];
  for (let i = 0; i < count; i++) {
    players.push(i + '');
  }
  return players;
}

export function getComponentName(
  component: ThreatDragonComponent | undefined,
): string {
  if (component === undefined) return '';

  const prefix = component.type.slice(3);

  if (component.type === 'tm.Flow') {
    return `${prefix}: ${component.labels?.[0].attrs.text.text}`;
  }

  return `${prefix}: ${component.attrs.text?.text}`;
}

export function getValidMoves(
  allCardsInHand: Card[],
  currentSuit: Suit | undefined,
  round: number,
  startingCard: Card,
): Card[] {
  if (!currentSuit && round <= 1) {
    return [startingCard];
  }

  const cardsOfSuit = getCardsOfSuit(allCardsInHand, currentSuit);

  return cardsOfSuit.length > 0 ? cardsOfSuit : allCardsInHand;
}

function getCardsOfSuit(cards: Card[], suit: Suit | undefined): Card[] {
  if (!suit) {
    return [];
  }
  return cards.filter((e) => e.startsWith(suit));
}

export function escapeMarkdownText(text: string): string {
  //replaces certain characters with an escaped version
  //doesn't escape * or _ to allow users to format the descriptions

  return text
    .replace(/[![\]()]/gm, '\\$&')
    .replace(/</gm, '&lt;')
    .replace(/>/gm, '&gt;');
}

export function getImageExtension(filename: string): string | undefined {
  const pattern = new RegExp(`\\.(?<extension>\\w+)$`);
  const matches = filename.match(pattern);
  if (matches && matches.groups && matches.groups.extension) {
    return matches.groups.extension;
  }
  return undefined;
}

export function asyncSetTimeout<U, F extends () => Promise<U>>(
  callback: F,
  delay: number,
): Promise<U> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      callback().then(resolve, reject);
    }, delay);
  });
}

export function logEvent(message: string): void {
  const now = new Date(Date.now()).toISOString();
  console.log(`${now} - ${message}`);
}

export function isModelType(value: string): value is ModelType {
  return Object.values<string>(ModelType).includes(value);
}

export function mapModel2toOldModel(model2: ThreatDragonModel2): ThreatDragonModel {
  return {
    version: model2.version,
    summary: {
      description: model2.summary.description,
      id: model2.summary.id,
      owner: model2.summary.owner,
      title: model2.summary.title,
    },
    detail: {
      contributors: model2.detail.contributors.map(contributor => ({
        name: contributor.name,
      })),
      diagrams: model2.detail.diagrams.map(diagram => ({
        diagramType: 'Data Flow',
        id: diagram.id,
        size: {
          height: 600,
          width: 800,
        },
        thumbnail: diagram.thumbnail,
        title: diagram.title,
        version: diagram.version,
        diagramJson: {
          cells: diagram.cells.map(cell => {
            
            let cellAttributes: ThreatDragonComponent = {
              attrs: {
                text: {
                  text: cell.data.type == "tm.BoundaryBox" ?"":cell.data.name,
                },
              },
              hasOpenThreats: cell.data.hasOpenThreats,
              id: cell.id,
              labels: cell.labels?.map(mlable => ({
                attrs: {
                  text: {
                    text: "",
                    'font-size': "small",
                    'font-weight': "400",
                  },
                },
                position: mlable.position,
              })),
              outOfScope: cell.data.outOfScope,
              size: {
                height: 10,
                width: 10,
              },
              type: cell.data.type,
              z: cell.zIndex || 1,
            };

            if(cell.data.type === "tm.BoundaryBox"){
              cellAttributes.type = "tm.Actor";
              cellAttributes.position = cell.position;
              if(cell.size){
              cellAttributes.size = cell.size;
              }

              cellAttributes.z = -1;

            }

            if (cell.data.type === "tm.Actor") {
              cellAttributes.angle = 0;

              cellAttributes.attrs = cellAttributes.attrs || {};
              const elementShape = '.element-shape';
              const elementText = '.element-text';
              const elementUndefined = '.undefined';
              cellAttributes.attrs[elementShape] = cellAttributes.attrs[elementShape] || {};
              cellAttributes.attrs[elementShape].class = "element-shape hasNoOpenThreats isInScope";
              cellAttributes.attrs[elementText] = cellAttributes.attrs[elementText] || {};
              cellAttributes.attrs[elementText].class = "element-text hasNoOpenThreats isInScope";

              cellAttributes.position = cell.position;

              if (cell.size) { cellAttributes.size = cell.size; }

              cellAttributes.threats = cell.data.threats?.map(threat => ({
                description: threat.description,
                mitigation: threat.mitigation,
                severity: threat.severity,
                status: threat.status,
                title: threat.title,
                type: threat.type,
              }));

            }

            if (cell.data.type === "tm.Boundary") {
              cellAttributes.attrs = {};
              cellAttributes.smooth = true;
              cellAttributes.source = cell.source;
              cellAttributes.target = cell.target;
              cellAttributes.vertices = cell.vertices;
              // if(cell.height){
              //   cellAttributes.size.height = cell.height;
              // }
              // if(cell.width){
              //   cellAttributes.size.width = cell.width;
              // }
            }

            if (cell.data.type === "tm.Process") {
              cellAttributes.angle = 0;

              cellAttributes.attrs = cellAttributes.attrs || {};
              const elementShape = '.element-shape';
              const elementText = '.element-text';
              cellAttributes.attrs[elementShape] = cellAttributes.attrs[elementShape] || {};
              cellAttributes.attrs[elementShape].class = "element-shape hasOpenThreats isInScope";
              cellAttributes.attrs[elementText] = cellAttributes.attrs[elementText] || {};
              cellAttributes.attrs[elementText].class = "element-text hasOpenThreats isInScope";

              cellAttributes.position = cell.position;

              cellAttributes.privilegeLevel = "executionContext =Limited";
              if (cell.size) { cellAttributes.size = cell.size; }

              cellAttributes.threats = cell.data.threats?.map(threat => ({
                description: threat.description,
                mitigation: threat.mitigation,
                severity: threat.severity,
                status: threat.status,
                title: threat.title,
                type: threat.type,
              }));
            }

            if (cell.data.type === "tm.Store") {
              cellAttributes.angle = 0;

              cellAttributes.attrs = cellAttributes.attrs || {};
              const elementShape = '.element-shape';
              const elementText = '.element-text';
              cellAttributes.attrs[elementShape] = cellAttributes.attrs[elementShape] || {};
              cellAttributes.attrs[elementShape].class = "element-shape hasOpenThreats isInScope";
              cellAttributes.attrs[elementText] = cellAttributes.attrs[elementText] || {};
              cellAttributes.attrs[elementText].class = "element-text hasOpenThreats isInScope";

              cellAttributes.position = cell.position;

              if (cell.size) { cellAttributes.size = cell.size; }

              cellAttributes.storesCredentials = cell.data.storesCredentials;
              cellAttributes.threats = cell.data.threats?.map(threat => ({
                description: threat.description,
                mitigation: threat.mitigation,
                severity: threat.severity,
                status: threat.status,
                title: threat.title,
                type: threat.type,
              }));
              cellAttributes.isEncrypted = cell.data.isEncrypted;
            }

            if (cell.data.type === "tm.Flow") {

              cellAttributes.smooth = true;
              cellAttributes.size.height = cell.height || 10;
              cellAttributes.size.width = cell.width || 10;

              cellAttributes.source = { id: cell.source?.cell };

              cellAttributes.target = { id: cell.target?.cell };

              cellAttributes.threats = cell.data.threats?.map(threat => ({
                description: threat.description,
                mitigation: threat.mitigation,
                severity: threat.severity,
                status: threat.status,
                title: threat.title,
                type: threat.type,
              }));

              cellAttributes.vertices = cell.vertices;
              cellAttributes.z = cell.zIndex || 1;
              return cellAttributes;
            }
            
            return cellAttributes;
          }),
        },
        diagramTop: model2.detail.diagramTop,
        reviewer: model2.detail.reviewer,
        threatTop: model2.detail.threatTop,
      })),
    },
  };
}
