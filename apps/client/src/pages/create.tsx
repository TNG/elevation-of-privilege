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
import type { PlayerID } from 'boardgame.io';
import _ from 'lodash';
import { ChangeEvent, Component, JSX } from 'react';
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

type CreateProps = Record<string, never>;

interface CreateState {
  players: number;
  matchID: string;
  names: Record<PlayerID, string>;
  secret: Record<PlayerID, string>;
  spectatorSecret: string;
  creating: boolean;
  created: boolean;
  modelType: ModelType;
  model: Record<string, unknown> | undefined;
  image: File | undefined;
  startSuit: Suit;
  turnDuration: number;
  provideModelThruAlternativeChannel: boolean;
  gameMode: GameMode;
  modelReference?: string;
}

class Create extends Component<CreateProps, CreateState> {
  fileReader: FileReader;
  apiBase: string;

  constructor(props: CreateProps) {
    super(props);
    const initialPlayerNames: Record<number, string> = {};
    const initialSecrets: Record<number, string> = {};
    _.range(MAX_NUMBER_PLAYERS).forEach((n) => {
      initialPlayerNames[n] = `Player ${n + 1}`;
      initialSecrets[n] = ``;
    });

    this.state = {
      players: 3,
      matchID: '',
      names: initialPlayerNames,
      secret: initialSecrets,
      spectatorSecret: ``,
      creating: false,
      created: false,
      modelType: ModelType.IMAGE,
      model: undefined,
      image: undefined,
      startSuit: DEFAULT_START_SUIT,
      turnDuration: DEFAULT_TURN_DURATION,
      provideModelThruAlternativeChannel: false,
      gameMode: DEFAULT_GAME_MODE,
      modelReference: undefined,
    };

    this.fileReader = new FileReader();
    this.fileReader.onloadend = this.onFileRead.bind(this);

    this.apiBase = '/api';
  }

  async createGame(): Promise<void> {
    this.setState({
      creating: true,
    });
    // FormData object (with file if required)
    const formData = new FormData();

    formData.append('players', `${this.state.players}`);
    formData.append('modelType', this.state.modelType);
    if (this.state.modelType !== ModelType.PRIVACY_ENHANCED) {
      formData.append(
        'model',
        this.state.modelType === ModelType.IMAGE
          ? (this.state.image ?? '')
          : JSON.stringify(this.state.model),
      );
    }
    for (let i = 0; i < this.state.players; i++) {
      formData.append('names[]', this.state.names[`${i}`]);
    }
    formData.append('startSuit', this.state.startSuit);
    formData.append('turnDuration', `${this.state.turnDuration}`);
    formData.append('gameMode', this.state.gameMode);
    if (this.state.modelReference) {
      formData.append('modelReference', this.state.modelReference);
    }

    const response = await fetch(`${this.apiBase}/game/create`, {
      method: 'POST',
      body: formData,
    });

    // TODO: zod validation
    const r = (await response.json()) as {
      game: string;
      credentials: string[];
      spectatorCredential: string;
    };

    const gameId = r.game;

    this.setState({
      secret: Object.fromEntries(r.credentials.map((s, i) => [i, s])),
      spectatorSecret: r.spectatorCredential,
      matchID: gameId,
      created: true,
    });
  }

  onFileRead(): void {
    if (typeof this.fileReader.result !== 'string') {
      throw new Error(
        "Expected `fileReader.result` to be a string but it wasn't.",
      );
    }
    // TODO: validation?
    const model = JSON.parse(this.fileReader.result) as CreateState['model'];
    this.setState({
      model,
    });
  }

  readJson(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) {
      throw new Error(
        'Expected change event to target an input element with a file but there was no file attached.',
      );
    }
    this.fileReader.readAsText(file);
  }

  updateImage(e: ChangeEvent<HTMLInputElement>): void {
    this.setState({
      image: e.target.files?.[0],
    });
  }

  onPlayersUpdated(e: ChangeEvent<HTMLInputElement>): void {
    this.setState({
      players: parseInt(e.target.value),
    });
  }

  onStartSuitUpdated(e: ChangeEvent<HTMLInputElement>): void {
    const startSuit = e.target.value as Suit;
    const gameMode = this.state.gameMode;
    if (!isSuitInDeck(startSuit, gameMode)) {
      throw new Error(`Invalid start suit '${startSuit}'`);
    }
    this.setState({
      startSuit,
    });
  }

  onGameModeUpdated(e: ChangeEvent<HTMLInputElement>): void {
    const gameMode = e.target.value as GameMode;
    this.setState({
      gameMode,
    });
  }

  onNameUpdated(idx: number, e: ChangeEvent<HTMLInputElement>): void {
    this.setState((prevState) => ({
      names: {
        ...prevState.names,
        [idx]: e.target.value,
      },
    }));
  }

  onTurnDurationUpdated(e: ChangeEvent<HTMLInputElement>): void {
    this.setState({
      turnDuration: Number.parseInt(e.target.value),
    });
  }

  onModelRefUpdated(e: ChangeEvent<HTMLInputElement>): void {
    this.setState({
      modelReference: e.target.value,
    });
  }

  isFormValid(): boolean {
    for (let i = 0; i < this.state.players; i++) {
      if (_.isEmpty(this.state.names[`${i}`])) {
        return false;
      }
    }
    if (
      (this.state.modelType === ModelType.THREAT_DRAGON && !this.state.model) ||
      (this.state.modelType === ModelType.IMAGE && !this.state.image)
    ) {
      return false;
    }
    return true;
  }

  updateModelType(e: ChangeEvent<HTMLInputElement>): void {
    const modelType = e.target.value;
    if (!isModelType(modelType)) {
      throw new Error(`Invalid model type ${modelType}`);
    }
    this.setState({
      modelType,
    });
  }

  url(playerId: PlayerID): string {
    const secret =
      playerId === SPECTATOR
        ? this.state.spectatorSecret
        : this.state.secret[playerId];
    return `${window.location.origin}/${this.state.matchID}/${playerId}/${secret}`;
  }

  formatAllLinks(): string {
    return (
      'You have been invited to a threat modeling game:\n\n' +
      Array(this.state.players)
        .fill(0)
        .map((_, i) => {
          return `${this.state.names[i]}:\t${this.url(`${i}`)}`;
        })
        .join('\n\n')
    );
  }

  render(): JSX.Element {
    const cardBody = !this.state.created ? (
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
                onChange={(e) => this.onPlayersUpdated(e)}
                value={this.state.players}
              >
                {_.range(MIN_NUMBER_PLAYERS, MAX_NUMBER_PLAYERS + 1).map(
                  (n) => (
                    <option key={`players-${n}`} value={n}>
                      {n}
                    </option>
                  ),
                )}
              </Input>
            </Col>
          </FormGroup>
          <hr />
          {Array(this.state.players)
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
                    invalid={_.isEmpty(this.state.names[i])}
                    name={`p${i}`}
                    id={`p${i}`}
                    onChange={(e) => this.onNameUpdated(i, e)}
                    value={this.state.names[i]}
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
                onChange={(e) => this.onGameModeUpdated(e)}
                value={this.state.gameMode}
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
                onChange={(e) => this.onStartSuitUpdated(e)}
                value={this.state.startSuit}
              >
                {getSuits(this.state.gameMode).map((suit) => (
                  <option value={suit} key={`start-suit-option-${suit}`}>
                    {getSuitDisplayName(this.state.gameMode, suit)}
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
                onChange={(e) => this.onTurnDurationUpdated(e)}
                value={this.state.turnDuration}
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
                      onChange={this.updateModelType.bind(this)}
                      checked={this.state.modelType === ModelType.IMAGE}
                    />
                    Provide Model via an image
                  </Label>
                  <Input
                    disabled={this.state.modelType !== ModelType.IMAGE}
                    type="file"
                    accept="image/*"
                    name="model-image"
                    id="model"
                    onChange={this.updateImage.bind(this)}
                    checked={this.state.modelType === ModelType.IMAGE}
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
                      onChange={this.updateModelType.bind(this)}
                      checked={
                        this.state.modelType === ModelType.PRIVACY_ENHANCED
                      }
                    />
                    Privacy enhanced mode.
                  </Label>
                  <Input
                    disabled={
                      this.state.modelType !== ModelType.PRIVACY_ENHANCED
                    }
                    type="text"
                    placeholder="Optional: Provide link to model (e.g. in wiki)"
                    className="text-input-wide"
                    onChange={(e) => this.onModelRefUpdated(e)}
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
                      onChange={this.updateModelType.bind(this)}
                    />
                    Provide model via Threat Dragon
                  </Label>
                  <Input
                    disabled={this.state.modelType !== ModelType.THREAT_DRAGON}
                    type="file"
                    name="model-json"
                    id="model"
                    onChange={this.readJson.bind(this)}
                    checked={this.state.modelType === ModelType.THREAT_DRAGON}
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
            disabled={this.state.creating || !this.isFormValid()}
            onClick={this.createGame.bind(this)}
          >
            Proceed
          </Button>
        </Form>
        <hr />
        <p className="centered">
          Alternatively, if you do not want to play a full game you can just
          select a few random cards.
        </p>
        <Button
          block
          size="lg"
          color="secondary"
          onClick={() => (window.location.href = `/random-card`)}
        >
          Draw a random card
        </Button>
      </div>
    ) : (
      <div>
        <Banner />
        <div className="text-center text-secondary">
          <p>
            The following links should be distributed to the players
            respectively.
          </p>
        </div>
        <Table className="table-sm">
          <tbody>
            {Array(this.state.players)
              .fill(0)
              .map((v, i) => (
                <tr key={i}>
                  <td className="c-td-name">{this.state.names[i]}</td>
                  <td>
                    <a
                      href={`${this.url(`${i}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {this.url(`${i}`)}
                    </a>
                  </td>
                  <td>
                    <CopyButton text={this.url(`${i}`)} />
                  </td>
                </tr>
              ))}
            <tr key="spectator" className="spectator-row">
              <td className="c-td-name">Spectator</td>
              <td>
                <a
                  href={`${this.url(SPECTATOR)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {this.url(SPECTATOR)}
                </a>
              </td>
              <td>
                <CopyButton text={this.url(SPECTATOR)} />
              </td>
            </tr>
          </tbody>
        </Table>
        <hr />
        <CopyButton
          text={this.formatAllLinks()}
          color="secondary"
          block
          size="lg"
        >
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
  }
}
export default Create;
