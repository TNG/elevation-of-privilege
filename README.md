# Elevation of Privilege

[![Tests](https://github.com/tng/elevation-of-privilege/actions/workflows/checks.yml/badge.svg)](https://github.com/tng/elevation-of-privilege/actions/workflows/checks.yml)

**Improve both: your application's security and your developer's awareness!**

Threat Modeling via Serious Games is the easy way to get started and increase the security of your projects. This is a card game that developers, architects or security experts can play.

This application implements an online version of the card games [Elevation of Privilege](https://download.microsoft.com/download/F/A/E/FAE1434F-6D22-4581-9804-8B60C04354E4/EoP_Whitepaper.pdf), [OWASP Cornucopia](https://owasp.org/www-project-cornucopia/), [OWASP Cumulus](https://owasp.org/www-project-cumulus/) and [Elevation of MLsec](https://github.com/kantega/elevation-of-mlsec), allowing to play the threat modeling games in remote or geo-distributed developer teams.

#### Play a demo!

[<img style="height:50px;cursor:pointer;float:right" src="docs/img/playit.svg"/>](https://threats-demo.thenerdgroup.de/)

_(Disclaimer: This demo instance is for testing purposes only. Do not add sensitive data!)_

[![Example](docs/eop.gif)](https://threats-demo.thenerdgroup.de/)

### Why Threat Modeling?

Nowadays, security is a topic that concerns every IT project. What if a malicious actor (for financial, ideological or any other reasons) wants to corrupt the system you are building? What if some skilled person wants to break in and steal your intellectual property or the data you are holding?

Threat Modeling is a systematic approach to the question "[What can go wrong?](https://www.threatmodelingmanifesto.org/)". It helps you and your team to take an attacker's perspective and understand your system aside from its features and business value. You will collect threats to your system and mitigate their risk before they get exploited and harm your business.

### And why Serious Games?

The idea to perform threat modeling on a system using a serious card game as developed by the security department at Microsoft. At its core, threat modeling should be done continuously as part of the (agile) development process. Thus, it should also be done by the developers, as they are the real experts on the system.

Microsoft's game allows developers, architects and security experts to find threats to the system even if they do not have a strong background in IT security. It is a threat catalog that guides the player's thoughts to new and unusual perspectives on the system, just as an attacker would do. Gamification makes this a fun thing to do and keeps the players motivated to find creative attacks.

But most important the game will teach the developers to look at the system with security in their mind. Therefore, it raises the awareness for security during implementation, avoiding threats from the start.

### How is this done?

In [Elevation of Privilege](https://download.microsoft.com/download/F/A/E/FAE1434F-6D22-4581-9804-8B60C04354E4/EoP_Whitepaper.pdf), the game invented by Microsoft, each card represents a particular attack on the system. The cards are meant as a starting point for brainstorming and discussions, if and where such an attack can be used on the system. During its flow the game guides the players through these threats in a structured manner. As a result a list of possible security weaknesses is generated.

## Card decks

Currently, four game modes are supported, reflecting different aspects of modern software development projects:

### Elevation of Privilege

This is the classic [Elevation of Privilege](https://shostack.org/games/elevation-of-privilege) game, developed by [Adam Shostack](https://github.com/adamshostack).
![card EoP](docs/EoP_cards_attributed.png)

### OWASP Cornucopia

Inspired by this, the game [Cornucopia](https://owasp.org/www-project-cornucopia/) has been developed by the [Open Web Application Security Project](https://owasp.org/) (OWASP). It specifically targets threat modeling of web application and might be an easy starting point for beginning threat modeling.

![card Cornucopia](docs/Cornucopia_cards_attributed.png)

### OWASP Cumulus

[Cumulus](https://owasp.org/www-project-cumulus/), developed at [TNG Technology Consulting](https://www.tngtech.com/en/index.html), is a threat modeling game targeting cloud and DevOps setups.

![card Cumulus](docs/Cumulus_cards_attributed.png)

### Elevation of MLsec

[Elevation of MLsec](https://github.com/kantega/elevation-of-mlsec) has been developed at [Kantega AS](https://www.kantega.no/). It's used to threat model artificial intelligence and ai-aided applications.
![card EoMLsec](docs/EoMLSec_cards_attributed.png)

## For users

When uploading an architectural model of your system you can choose between different formats:

- an image (`.jpg`, `.png`, `.svg`, ...)
- JSON model generated with [OWASP Threat Dragon](https://owasp.org/www-project-threat-dragon/)
- no upload (this might be relevant you must comply to strict confidentiality regulation and want to supply the model via some different channel)

When starting the game you can configure the game mode and generate unique links for each of your players. With these links the players with their own hand of cards.

This game is intended to be supplemented by your favorite conferencing system. A crucial part are discussions between the players, so you better make sure your players can talk easily (e.g. via a video call).

Often it is beneficial (but not necessary!) to have a moderator, experienced in the game, who can steer the discussions and cut them off in case they run too long. For this role, a spectator mode is available in the game.

For the case of Elevation of Privilege, we partly support the latest version (as of April 2022) of the [EoP card deck](https://github.com/adamshostack/eop). However, we deviate in some Denial-of-Service cards. In particular, we still use the cards of an older version of the EoP card deck ([pre April 2020](https://github.com/adamshostack/eop/commit/a967aa273bfce60aa5eb4d7f2a37b6ae312ffd01)) for the cards `DoS3`, `DoS4` and `DoS5`. We do this because find the older versions better suited for our use cases.

## For developers

This repository allows you to build docker containers ready to be deployed e.g. to Kubernetes.

The frontend and backend are written in TypeScript and use [boardgame.io](https://boardgame.io/) as a framework for turn based games. The backend furthermore exposes an API using [koa](https://koajs.com/). The frontend is written in [react](https://reactjs.org/).

This repository uses [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces) to structure the different sub-packages and [Turborepo](https://turbo.build/repo) as a build system and task runner.

### Running the app

There are two components that need to be started in order to run the game.

1. Server
2. UI/Client

#### Docker

To start a dockerized version of the game use

```bash
docker compose up --build
```

This will start the app on port `8080` and make it accessible at [http://localhost:8080/](http://localhost:8080/).
The docker-compose setup starts two containers:

- `threats-client`: running `nginx` as a reverse proxy and serving the react application
- `threats-server`: running the Node.js backend: public API and game server

![docker-compose setup](docs/docker-setup.svg)

#### Local deployment

To start both the server and UI in dev mode, just run

```bash
npx turbo run dev
```

For starting and building the individual applications separately, read on.

The server can be started in dev mode using:

```bash
npx turbo run dev --filter=@eop/server
```

This will build any dependencies of the server if necessary and then start the backend application in dev mode,
listening on the following ports:

| Application | Description                                                       | Environment Variable | Default |
| ----------- | ----------------------------------------------------------------- | -------------------- | ------- |
| Server      | The game server for boardgame, exposes socket.io endpoints        | `SERVER_PORT`        | 8000    |
| Lobby API   | Internal API for lobby operations, should not be exposed publicly | `INTERNAL_API_PORT`  | 8002    |
| Public API  | Public API to create games and retrieve game info                 | `API_PORT`           | 8001    |

If you want to build the server code manually, you can do so by running

```bash
npx turbo run build --filter=@eop/server
```

You can also start the server in production mode:

```bash
npx turbo run start --filter=@eop/server
```

The UI can be started in dev mode using

```bash
npx turbo run dev --filter=@eop/client
```

The UI is accessible at [http://localhost:5173/](http://localhost:5173/).

The UI can also be built and served statically (see the [Dockerfile](apps/client/Dockerfile)). It assumes that it can access the public API at `/api` and the websocket connection at `/socket.io`, on the same origin that it was served at. Usually, this means you will need some kind of reverse proxy to pass those connections on to the server. See the [nginx configuration](apps/client/nginx/etc/nginx/) for more details.

To build the client, run

```bash
npx turbo run build --filter=@eop/client
```

To start it in production mode, run

```bash
npx turbo run start --filter=@eop/client
```

To build both the client and the server, just run

```bash
npx turbo run build
```

Similarly, you can also start both the server and client in production mode:

```bash
npx turbo run start
```

#### Imprint and privacy notices

Links to imprint and privacy notices can be included into the client, if the environment variables

```bash
export VITE_EOP_IMPRINT="https://example.tld/imprint/"
export VITE_EOP_PRIVACY="https://example.tld/privacy/"
```

are set when building the app.
When building the client via docker these env vars can be set by defining `build-args`

```bash
docker build --build-arg "VITE_EOP_IMPRINT=https://example.tld/imprint/" --build-arg "VITE_EOP_PRIVACY=https://example.tld/privacy/" -f apps/client/Dockerfile . -t "some-tag"
```

### Versioning

This repository uses [Changesets](https://github.com/changesets/changesets) for versioning.

When you introduce a change that warrants a version bump (e.g., a new feature or bug fix), please run

```bash
npx changeset add
```

and follow the instructions to add a new changeset for the relevant packages.

A release can then be performed by running

```bash
npx changeset version && npm install
```

and committing and pushing the changes.

## Credits

The initial version of this online game was developed in 2018 by [dehydr8](https://github.com/dehydr8), working for Careem at that time. This repository is a fork of the [original one](https://github.com/dehydr8/elevation-of-privilege) including further maintenance and developments like the introduction of alternative card decks. We would like to thank dehydr8 for his great work in setting up this game.

The card game Elevation of Privilege was originally invented by [Adam Shostack](https://adam.shostack.org/) at Microsoft and is licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The [EoP Whitepaper](http://download.microsoft.com/download/F/A/E/FAE1434F-6D22-4581-9804-8B60C04354E4/EoP_Whitepaper.pdf) written by Adam can be downloaded which describes the motivation, experience and lessons learned in creating the game.

The card game Cornucopia was originally developed by the [OWASP Foundation](https://owasp.org/). In this application a slightly modified version of the original card game is used. This can be found in the subfolder `cornucopiaCards/`. As the original, the modified version is licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).

The card game Elevation of MLsec was developed at [Kantega AS](https://www.kantega.no/). This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International license (https://creativecommons.org/licenses/by-sa/4.0/).

The motivation for creating this online version of the game at Careem was due to a large number of teams working remotely across several geographies and we wanted to scale our method of teaching threat modeling to our engineering teams.

The game is built using [boardgame.io](https://boardgame.io/), a framework for developing turn based games. The graphics, icons and card images used in this version were extracted from the original card game built by Microsoft.

Made with :green_heart: at [TNG Technology Consulting](https://www.tngtech.com/en/)
