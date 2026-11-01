# Feature Specification: Delivery Security Headers and Content Security Policy

**Feature Branch**: `fix/delivery-security-headers`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "extract the CSP part into a dedicated spec". This spec is extracted from `specs/001-harden-create-endpoint/spec.md` (User Story 3, FR-019–FR-022, SC-004, and the related edge cases). It supersedes that delivery-protection scope, which is removed from spec 001. The concrete header values already agreed in `specs/001-harden-create-endpoint/contracts/response-headers.md` carry over unchanged.

## Context

Participants open a game link and their browser renders everything the application delivers: pages, API data, and images that other people uploaded. Spec 001 hardens the input side at game creation. This feature is the delivery-side backstop: even if an input check ever has a gap, the instructions sent with every response tell the browser what it may do with the content. These protections originated in PRs #358 and #360, and the maintainer agreed with them, so dropping them would be a regression.

Every response instructs the browser to:

- treat the content strictly as its declared type;
- refuse to embed the application in other sites;
- run only the application's own scripts.

Uploaded SVG images are additionally delivered as downloads that may not run any script or load any resource, so they can never execute as standalone pages.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every response tells browsers to treat content strictly (Priority: P1)

A participant's browser loads the application: pages, API data, images, even error pages. Every response carries the three protective instructions: no content-type guessing, no embedding in other sites' frames, and a content security policy that allows only the application's own scripts, styles, images and connections.

**Why this priority**: This is the safety net for every other content risk. Without it, nothing else in this spec applies, and a single gap in input validation turns into script execution in participants' browsers.

**Independent Test**:
- Request the application page, a successful API response, an error response (e.g. a 404), and a game's image. Verify each response carries the content-type strictness instruction, the framing refusal, and the content security policy, each exactly once.
- In a browser, inject an inline script into a page via developer tools and verify the browser blocks it.

**Acceptance Scenarios**:

1. **Given** any API response, successful or failed (including client errors, server errors, and unknown routes), **When** it is delivered, **Then** it forbids the browser from guessing a content type other than the declared one, forbids embedding in frames of other sites, and carries a content security policy.
2. **Given** any response of the static client in production, **When** it is delivered, **Then** it carries the same three instructions.
3. **Given** any API response in the development environment, **When** it is delivered, **Then** it carries the same instructions.
4. **Given** any protected response, **When** it is delivered, **Then** each instruction appears exactly once (never duplicated).
5. **Given** a page with an injected inline script or inline event handler, **When** the browser renders it, **Then** the script or handler is blocked and the console shows the block.

---

### User Story 2 - Uploaded SVG images can never run as pages (Priority: P1)

A game created with an uploaded SVG image can still be opened by participants. When the browser requests that image, the response tells it to save the file as a download instead of displaying it as a page, and forbids all script execution and resource loading for it. Uploaded raster images (PNG, JPEG, GIF, WebP) keep their normal in-page display, with only the global instructions added.

**Why this priority**: SVG is the one image format that can contain executable content, and the image URL can be opened directly. The download-and-forbid combination removes that path even if sanitization ever has a gap.

**Independent Test**:
- Request a game's SVG image: verify the response declares its image type, is marked as a download, and forbids all script execution and resource loading.
- Request a game's raster image: verify it carries the global instructions and is not forced to download, and still renders inside the game page.

**Acceptance Scenarios**:

1. **Given** a game with an SVG image, **When** the image is requested, **Then** the response tells the browser to download it rather than display it as a page, and forbids it from running any script or loading any resource.
2. **Given** a game with a raster image, **When** the image is requested, **Then** the response carries the global instructions and does not force a download, so in-page display is unchanged.
3. **Given** a game page showing an uploaded image, **When** a participant views it, **Then** the image is displayed exactly as before this change, including previews created in memory from downloaded data.

---

### User Story 3 - The application keeps working under the strict policy (Priority: P2)

The facilitator and participants use the application as before: create a game, open the board, see cards and uploaded diagrams, and play over the live game connection. The strict instructions must not break any of this.

**Why this priority**: A policy that blocks working features would have to be weakened or reverted. Verifying compatibility is required for release confidence but depends on the other two stories being in place.

**Independent Test**:
- Play a full game session with a participant: create a game, see the board, cards, and an uploaded image, and finish a turn over the live connection. Verify the browser console shows no policy violations and no feature is broken.

**Acceptance Scenarios**:

1. **Given** a full game session (board, cards, in-page image previews, live game connection), **When** it is played in a browser, **Then** no feature is broken and the console shows no policy violations.
2. **Given** the production build of the client, **When** it is built, **Then** it contains no inline scripts and no inline event handlers, so it needs no exception from the script policy.
3. **Given** the live game connection, **When** the game is played, **Then** the connection is established and maintained under the policy.

### Edge Cases

- **Error responses** (client errors, server errors, unknown routes): also carry the three instructions.
- **Raster images are not forced to download.** They get the global instructions only, so in-page display is unchanged.
- **Duplicate headers**: where the web server proxies API traffic to the application server, each instruction must appear exactly once per response, not once from each component.
- **The development page is exempt from the content security policy**: the development server needs inline scripts for hot reloading. API responses still carry the full instructions in every environment.
- **Framing is refused twice, deliberately**: a legacy header for older browsers and the policy directive for current ones.
- **Inline styles are allowed deliberately**: the client injects styles at runtime, so the style policy must keep permitting them.
- **Downloads the application itself offers** (e.g. exported reports, images): they carry the instructions too and keep downloading normally.

## Requirements *(mandatory)*

### Functional Requirements

**Global delivery instructions**

- **FR-001**: Every API response, in every environment, MUST carry: an instruction that forbids the browser from guessing a content type other than the declared one; an instruction that forbids embedding the response in frames of other sites; and a content security policy.
- **FR-002**: Every response of the static client in production MUST carry the same three instructions.
- **FR-003**: Error responses (client errors, server errors, unknown routes) MUST carry the same instructions as successful responses.
- **FR-004**: Each instruction MUST appear exactly once per response. Where multiple components can add headers (for example a web server in front of the application server), the setup MUST ensure no duplication.
- **FR-005**: The protective instructions MUST be defined in one place and applied uniformly, so that tests, documentation and configuration cannot drift apart.

**Content security policy**

- **FR-006**: The content security policy MUST:
  - allow scripts only from the application's own origin, which blocks inline scripts and inline event handlers;
  - allow styles from the own origin plus inline styles;
  - allow images from the own origin, data-embedded sources and in-memory (in-session) sources;
  - allow connections only to the own origin, including its live game connection;
  - forbid plugin objects;
  - restrict the document base address to the own origin;
  - forbid embedding the response in frames of other sites.

**Image delivery**

- **FR-007**: When a game's SVG image is delivered, the response MUST tell the browser to download it rather than render it as a page, declare its actual image type, and forbid all script execution and resource loading for that response.
- **FR-008**: Raster image responses MUST carry the global instructions and MUST NOT be forced to download, so in-page display is unchanged.

**Compatibility**

- **FR-009**: The delivery instructions MUST NOT break any working feature: pages load, styles apply, images display (including in-page previews of uploaded images), and the live game connection stays established.
- **FR-010**: The production build of the client MUST NOT depend on inline scripts or inline event handlers.
- **FR-011**: In the development environment, the content security policy applies to API responses only; the development page, which needs inline scripts for hot reloading, is exempt.
- **FR-012**: The instructions MUST NOT prevent the client from calling the API during development, where the client page is served from a different local port than the API.

### Key Entities

- **Delivery instructions**: the protective instructions sent with every response: content-type strictness, framing refusal, content security policy, and download-versus-display.
- **Global content security policy**: the one policy that states which scripts, styles, images and connections the application's own pages and responses may use.
- **Image delivery rules**: per content type — SVG images are delivered as downloads that may not run anything; raster images are displayed inline with the global instructions.
- **Response class**: the kind of response being protected (static page, API response, error response, raster image, SVG image), each with its required set of instructions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of checked responses carry the delivery protections, each exactly once. The check covers the application page, a successful API response, an error response, a raster image response and an SVG image response.
- **SC-002**: An injected inline script is blocked by the browser during a game session, and a full game (create, open, play a turn with an uploaded image) shows zero policy violations in the browser console.
- **SC-003**: 100% of existing user flows keep working with no visible change: game creation, board display, in-page image display, and the live game connection.
- **SC-004**: Opening a game's SVG image URL directly results in a download instead of a rendered page; raster image URLs still render.

## Assumptions

- This spec takes over spec 001's User Story 3, FR-019–FR-022, SC-004 and the related edge cases; spec 001 is reduced accordingly so the scope is implemented exactly once. The concrete header values agreed in `specs/001-harden-create-endpoint/contracts/response-headers.md` are reused unchanged.
- Allowing connections only to the own origin covers the live game connection (same-origin real-time connections) in current browsers.
- Inline styles remain allowed because the client injects styles at runtime; removing that need is out of scope.
- Input-side hardening (model validation, image detection, SVG sanitization) stays in spec 001. This spec is only the delivery backstop.
- The development setup serves the client page from a development server that needs inline scripts for hot reloading; therefore the policy is enforced there only on API responses.
- Deployment-level policies (cross-origin policy, referrer policy, protection of the internal game service API) remain out of scope, as in spec 001.

## Out of Scope

- Nonce- or hash-based content security policies, a report-only rollout, and violation reporting endpoints (possible future hardening).
- All input validation and upload sanitization from spec 001 (Threat Dragon models, image type detection, SVG cleaning).
- Deployment hardening listed in spec 001: cross-origin policy, referrer policy, protection of the internal game service API, and credentials in links.
- Protective headers on the development server's own page (hot reload needs inline scripts).
- Client changes beyond what compatibility requires (error boundary, model reference rendering).
