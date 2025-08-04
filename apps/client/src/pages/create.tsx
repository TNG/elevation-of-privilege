import {
  DEFAULT_GAME_MODE,
  DEFAULT_START_SUIT,
  DEFAULT_TURN_DURATION,
  GameMode,
  getSuitDisplayName,
  getSuits,
  isModelType,
  isSuitInDeck,
  MAX_NUMBER_PLAYERS,
  MIN_NUMBER_PLAYERS,
  ModelType,
  SPECTATOR,
  Suit,
} from '@eop/shared';
import { ChangeEvent, FC, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
  FormFeedback,
  FormGroup,
  FormText,
  Input,
  Label,
  Row,
  Table,
} from 'reactstrap';

import Banner from '../components/banner/banner';
import CopyButton from '../components/copybutton/copybutton';
import Footer from '../components/footer/footer';
import Logo from '../components/logo/logo';

import '../styles/create.css';

const apiBase = '/api';

const Create: FC = () => {
  const [players, setPlayers] = useState(3);
  const [matchID, setMatchID] = useState('');
  const [names, setNames] = useState(
    Array.from({ length: MAX_NUMBER_PLAYERS }, (_, n) => `Player ${n + 1}`),
  );
  const [secret, setSecret] = useState(
    Array.from({ length: MAX_NUMBER_PLAYERS }, () => ''),
  );
  const [spectatorSecret, setSpectatorSecret] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [modelType, setModelType] = useState(ModelType.IMAGE);
  const [model, setModel] = useState<Record<string, unknown> | undefined>(
    undefined,
  );
  const [image, setImage] = useState<File | undefined>(undefined);
  const [startSuit, setStartSuit] = useState<Suit>(DEFAULT_START_SUIT);
  const [turnDuration, setTurnDuration] = useState(DEFAULT_TURN_DURATION);
  const [gameMode, setGameMode] = useState(DEFAULT_GAME_MODE);
  const [modelReference, setModelReference] = useState<string | undefined>(
    undefined,
  );

  const createGame = async () => {
    setCreating(true);
    // FormData object (with file if required)
    const formData = new FormData();

    formData.append('modelType', modelType);
    if (modelType !== ModelType.PRIVACY_ENHANCED) {
      formData.append(
        'model',
        modelType === ModelType.IMAGE ? (image ?? '') : JSON.stringify(model),
      );
    }
    names.slice(0, players).forEach((name) => formData.append('names[]', name));
    formData.append('startSuit', startSuit);
    formData.append('turnDuration', `${turnDuration}`);
    formData.append('gameMode', gameMode);
    if (modelReference) {
      formData.append('modelReference', modelReference);
    }

    const response = await fetch(`${apiBase}/game/create`, {
      method: 'POST',
      body: formData,
    });

    // TODO: valibot validation
    const r = (await response.json()) as {
      game: string;
      credentials: string[];
      spectatorCredential: string;
    };

    const gameId = r.game;

    setSecret([...r.credentials]);
    setSpectatorSecret(r.spectatorCredential);
    setMatchID(gameId);
    setCreated(true);
  };

  const readJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      throw new Error(
        'Expected change event to target an input element with a file but there was no file attached.',
      );
    }

    setModel(JSON.parse(await readFileAsText(file)) as Record<string, unknown>);
  };

  const updateImage = (e: ChangeEvent<HTMLInputElement>) => {
    setImage(e.target.files?.[0]);
  };

  const onPlayersUpdated = (e: ChangeEvent<HTMLInputElement>) => {
    setPlayers(parseInt(e.target.value));
  };

  const onStartSuitUpdated = (e: ChangeEvent<HTMLInputElement>) => {
    const newStartSuit = e.target.value;
    if (!isSuitInDeck(newStartSuit, gameMode)) {
      throw new Error(`Invalid start suit '${newStartSuit}'`);
    }
    setStartSuit(newStartSuit);
  };

  const onGameModeUpdated = (e: ChangeEvent<HTMLInputElement>) => {
    const newGameMode = e.target.value as GameMode;
    setGameMode(newGameMode);
  };

  const onNameUpdated = (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    setNames((prevNames) => prevNames.toSpliced(idx, 1, e.target.value));
  };

  const onTurnDurationUpdated = (e: ChangeEvent<HTMLInputElement>) => {
    setTurnDuration(Number.parseInt(e.target.value));
  };

  const onModelRefUpdated = (e: ChangeEvent<HTMLInputElement>) => {
    setModelReference(e.target.value);
  };

  const isFormValid = (): boolean => {
    return (
      names.slice(0, players).every((name) => name !== '') &&
      (modelType !== ModelType.THREAT_DRAGON || model !== undefined) &&
      (modelType !== ModelType.IMAGE || image !== undefined)
    );
  };

  const updateModelType = (e: ChangeEvent<HTMLInputElement>) => {
    const newModelType = e.target.value;
    if (!isModelType(newModelType)) {
      throw new Error(`Invalid model type ${newModelType}`);
    }
    setModelType(newModelType);
  };

  const url = (playerId: number | typeof SPECTATOR): string => {
    const secretValue =
      playerId === SPECTATOR ? spectatorSecret : secret[playerId];
    return `${window.location.origin}/${matchID}/${playerId}/${secretValue}`;
  };

  const formatAllLinks = (): string => {
    return (
      'You have been invited to a threat modeling game:\n\n' +
      Array(players)
        .fill(0)
        .map((_, i) => {
          return `${names[i]}:\t${url(i)}`;
        })
        .join('\n\n')
    );
  };

  const cardBody = !created ? (
    <div>
      <Banner />
      <Form>
        <FormGroup row>
          <Label for="players" sm={2}>
            Players
          </Label>
          <Col sm={10}>
            <Input
              type="select"
              name="players"
              id="players"
              onChange={(e) => onPlayersUpdated(e)}
              value={players}
            >
              {Array.from(
                { length: MAX_NUMBER_PLAYERS - MIN_NUMBER_PLAYERS },
                (_, i) => i + MIN_NUMBER_PLAYERS,
              ).map((n) => (
                <option key={`players-${n}`} value={n}>
                  {n}
                </option>
              ))}
            </Input>
          </Col>
        </FormGroup>
        <hr />
        {Array(players)
          .fill(0)
          .map((v, i) => (
            <FormGroup row key={i}>
              <Label for={`p${i}`} sm={2}>
                Name
              </Label>
              <Col sm={10}>
                <Input
                  autoComplete={'off'}
                  type="text"
                  invalid={names[i] === undefined || names[i] === ''}
                  name={`p${i}`}
                  id={`p${i}`}
                  onChange={(e) => onNameUpdated(i, e)}
                  value={names[i]}
                />
                <FormFeedback>The name cannot be empty</FormFeedback>
              </Col>
            </FormGroup>
          ))}
        <hr />
        <FormGroup row>
          <Label for="gameMode" sm={2}>
            Game Mode
          </Label>
          <Col sm={10}>
            <Input
              id="gameMode"
              type="select"
              onChange={(e) => onGameModeUpdated(e)}
              value={gameMode}
            >
              {Object.values(GameMode).map((mode) => (
                <option key={`option-${mode}`}>{mode}</option>
              ))}
            </Input>
          </Col>
        </FormGroup>
        <FormGroup row>
          <Label for="startSuit" sm={2}>
            Start Suit
          </Label>
          <Col sm={10}>
            <Input
              type="select"
              name="startSuit"
              id="startSuit"
              onChange={(e) => onStartSuitUpdated(e)}
              value={startSuit}
            >
              {getSuits(gameMode).map((suit) => (
                <option value={suit} key={`start-suit-option-${suit}`}>
                  {getSuitDisplayName(gameMode, suit)}
                </option>
              ))}
            </Input>
          </Col>
        </FormGroup>
        <hr />
        <FormGroup row>
          <Label for="turnDuration" sm={2}>
            Turn Duration
          </Label>
          <Col sm={10}>
            <Input
              type="select"
              name="turnDuration"
              id="turnDuration"
              onChange={(e) => onTurnDurationUpdated(e)}
              value={turnDuration}
            >
              <option value={0}>No Timer</option>
              <option value={180}>3 mins</option>
              <option value={300}>5 mins</option>
              <option value={600}>10 mins</option>
            </Input>
          </Col>
        </FormGroup>
        <hr />
        <FormGroup row>
          <Label for="model" sm={2}>
            Model
          </Label>
          <Col sm={10}>
            <FormGroup>
              <FormGroup check>
                <Label check>
                  <Input
                    type="radio"
                    name="model-type"
                    value={ModelType.IMAGE}
                    onChange={updateModelType}
                    checked={modelType === ModelType.IMAGE}
                  />
                  Provide Model via an image
                </Label>
                <Input
                  disabled={modelType !== ModelType.IMAGE}
                  type="file"
                  accept="image/*"
                  name="model-image"
                  id="model"
                  onChange={updateImage}
                  checked={modelType === ModelType.IMAGE}
                />
                <FormText color="muted">(Max. 5 MB)</FormText>
              </FormGroup>
            </FormGroup>
            <FormGroup>
              <FormGroup check>
                <Label check>
                  <Input
                    id="radio-button-default-model"
                    type="radio"
                    value={ModelType.PRIVACY_ENHANCED}
                    name="model-type"
                    onChange={updateModelType}
                    checked={modelType === ModelType.PRIVACY_ENHANCED}
                  />
                  Privacy enhanced mode.
                </Label>
                <Input
                  disabled={modelType !== ModelType.PRIVACY_ENHANCED}
                  type="text"
                  placeholder="Optional: Provide link to model (e.g. in wiki)"
                  className="text-input-wide"
                  onChange={(e) => onModelRefUpdated(e)}
                />
              </FormGroup>
            </FormGroup>
            <FormGroup>
              <FormGroup check>
                <Label check>
                  <Input
                    type="radio"
                    name="model-type"
                    value={ModelType.THREAT_DRAGON}
                    onChange={updateModelType}
                  />
                  Provide model via Threat Dragon
                </Label>
                <Input
                  disabled={modelType !== ModelType.THREAT_DRAGON}
                  type="file"
                  name="model-json"
                  id="model"
                  onChange={readJson}
                  checked={modelType === ModelType.THREAT_DRAGON}
                />
                <FormText color="muted">
                  Select the JSON model produced by{' '}
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://owasp.org/www-project-threat-dragon/"
                  >
                    Threat Dragon
                  </a>
                  . Or download a{' '}
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://raw.githubusercontent.com/mike-goodwin/owasp-threat-dragon-demo/master/ThreatDragonModels/Demo%20Threat%20Model/Demo%20Threat%20Model.json"
                  >
                    sample model
                  </a>{' '}
                  to try it out.
                </FormText>
              </FormGroup>
            </FormGroup>
          </Col>
        </FormGroup>
        <hr />
        <Button
          block
          size="lg"
          color="primary"
          disabled={creating || !isFormValid()}
          onClick={createGame}
        >
          Proceed
        </Button>
      </Form>
      <hr />
      <p className="centered">
        Alternatively, if you do not want to play a full game you can just
        select a few random cards.
      </p>
      <Button block size="lg" color="secondary" href="/random-card" tag="a">
        Draw a random card
      </Button>
    </div>
  ) : (
    <div>
      <Banner />
      <div className="text-center text-secondary">
        <p>
          The following links should be distributed to the players respectively.
        </p>
      </div>
      <Table className="table-sm">
        <tbody>
          {Array(players)
            .fill(0)
            .map((v, i) => (
              <tr key={i}>
                <td className="c-td-name">{names[i]}</td>
                <td>
                  <a
                    href={`${url(i)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {url(i)}
                  </a>
                </td>
                <td>
                  <CopyButton text={url(i)} />
                </td>
              </tr>
            ))}
          <tr key="spectator" className="spectator-row">
            <td className="c-td-name">Spectator</td>
            <td>
              <a
                href={`${url(SPECTATOR)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {url(SPECTATOR)}
              </a>
            </td>
            <td>
              <CopyButton text={url(SPECTATOR)} />
            </td>
          </tr>
        </tbody>
      </Table>
      <hr />
      <CopyButton text={formatAllLinks()} color="secondary" block size="lg">
        Copy All
      </CopyButton>
      <hr />
      <div className="text-center">
        <small className="text-secondary">
          These links are unique for each player and would allow them to join
          the game.
        </small>
      </div>
    </div>
  );

  return (
    <div>
      <Container className="create">
        <Row style={{ paddingTop: '20px' }}>
          <Col sm="12" md={{ size: 6, offset: 3 }}>
            <div className="text-center">
              <Logo />
            </div>
            <Card className="create-card">
              <CardHeader className="text-center">Threat Modeling</CardHeader>
              <CardBody>{cardBody}</CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col sm="12" md={{ size: 6, offset: 3 }} className="text-center">
            <Footer />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Create;

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const result = fileReader.result;
      if (typeof result !== 'string') {
        reject(
          new Error(
            `Expected 'fileReader.result' to be of type string but it was ${typeof result}`,
          ),
        );
      } else {
        resolve(result);
      }
    };
    fileReader.onerror = reject;
    fileReader.readAsText(file);
  });
}
