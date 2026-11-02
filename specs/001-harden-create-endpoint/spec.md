# Feature Specification: Harden Game Creation Against Injected Content

**Feature Branch**: `fix/create-sanitization`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "create a spec for the above plan". The plan fixes the game creation entry point:

- validate all creation input in one place;
- accept Threat Dragon models only as pure diagram data;
- accept uploaded images only when their real content is a safe image;
- validate before anything is stored;
- return clear client errors.

Extended after reviewing open pull requests TNG/elevation-of-privilege#358 (SVG upload XSS) and #360 (file type bypass via a spoofed Content-Type). This feature supersedes both. Their delivery-side protections were extracted into a dedicated spec: `specs/002-delivery-security-headers/`.

## Context

Anyone can create a game without logging in. The person creating a game supplies an architecture model, and every participant's browser later displays it. Today the creation step stores what it receives almost unchanged, which leads to the following weaknesses:

- **Stored script injection via Threat Dragon models.** A model can carry display markup that runs code in every participant's browser as soon as they open their game link. No open PR addresses this.
- **Stored script injection via uploaded SVG images (PR #358).** The code runs when a participant opens the image directly.
- **File type bypass (PR #360).** The server trusts the file name and type the uploader claims, so arbitrary files (HTML, PHP, …) can be stored and later delivered as something other than an image.
- **Cross-game image access.** A model can include a field that makes the server deliver another game's image.
- **Half-created games.** A game is created before its model is checked, so failed requests leave broken games behind.

This feature fixes these weaknesses at the point where games are created. The protective response instructions for when models and the application are delivered to browsers were extracted into `specs/002-delivery-security-headers/`. Other weaknesses are listed under Out of Scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Participants are protected from malicious Threat Dragon models (Priority: P1)

A facilitator creates a game from a Threat Dragon model and shares the links with participants. An attacker tries to create a game whose model contains hidden display markup or code. The system refuses to create that game, so no participant is ever shown attacker-controlled code.

**Why this priority**: This is the most severe weakness. Participants only need to open their link, with no other interaction, and the attacker's code runs with their game access.

**Independent Test**:
- Submit creation requests whose model carries display markup in an element, a connector label, a tool or styling section, or an event handler. Verify each is refused with an explanatory error and that no game exists afterwards.
- Submit a legitimate Threat Dragon export. Verify the game is created and the diagram renders unchanged.

**Acceptance Scenarios**:

1. **Given** a model in which a diagram element defines its own display markup, **When** the game is created, **Then** creation is refused with a client error that names the offending element and field, and no game is stored.
2. **Given** a model whose element styling includes an event handler, embedded HTML content or a link target, **When** the game is created, **Then** creation is refused with a client error and no game is stored.
3. **Given** a model whose connector labels define their own markup, **When** the game is created, **Then** creation is refused.
4. **Given** a model with an element type other than process, store, actor, data flow or trust boundary, **When** the game is created, **Then** creation is refused.
5. **Given** a legitimate Threat Dragon export, including exports with extra descriptive metadata, **When** the game is created, **Then** the game is created and every participant sees the same diagram as before this change.
6. **Given** a model that is not valid structured data, or that lacks a title or at least one diagram, **When** the game is created, **Then** creation is refused with a client error.

---

### User Story 2 - Uploaded images can never deliver code (Priority: P1)

A facilitator creates a game from an uploaded image of the architecture. The system checks what the file actually contains, not what the uploader claims. It stores the file only if it is a supported image whose claimed type and name do not contradict its content. For SVG drawings, the system removes any active content and stores only its own cleaned copy, so many SVGs made with drawing tools can still be used.

**Why this priority**: SVG uploads with active content and files with a falsely claimed type are confirmed stored-injection paths that reach every participant (PRs #358 and #360).

**Independent Test**:
- Upload an SVG containing a script, an event handler and a script link. Verify the game is created and the stored image contains none of them.
- Upload each of these and verify it is refused and nothing is stored:
  - a file that is not a well-formed SVG drawing but claims to be one;
  - a PHP script claiming to be a PNG;
  - an HTML page renamed to `.png`;
  - an SVG claiming to be a PNG;
  - a real PNG named `shell.php`.
- Upload a clean PNG, JPEG, GIF, WebP and SVG, and verify each is accepted and displayed.

**Acceptance Scenarios**:

1. **Given** an SVG image containing scripts, event handlers, embedded foreign content, script links, document type declarations or style sheet instructions, **When** the game is created, **Then** the game is created, the stored image contains none of this active content, and the removal is logged as a security event.
2. **Given** a clean SVG image, **When** the game is created, **Then** the game is created and the image is displayed with the same visual appearance.
3. **Given** a file claimed to be SVG that is not a well-formed SVG drawing (broken markup, an HTML page, or no SVG drawing at its top level), **When** the game is created, **Then** creation is refused and nothing is stored.
4. **Given** a file whose content is not a supported image (for example a PHP script or an HTML page) but which claims an image type or name, **When** the game is created, **Then** creation is refused.
5. **Given** a file whose content is one supported image type but which claims another (for example SVG content declared as PNG), **When** the game is created, **Then** creation is refused.
6. **Given** a valid image whose file name has an extension that contradicts its detected content (for example a real PNG named `shell.php` or `evil.html`), **When** the game is created, **Then** creation is refused.
7. **Given** a valid image whose file name has no extension, or an extension matching its content (`.jpg` and `.jpeg` are treated as equivalent), **When** the game is created, **Then** the image is accepted and stored as its detected type.
8. **Given** an upload that is refused for any reason, **When** the request completes, **Then** no copy of the uploaded file remains on the server.

---

### User Story 3 - Delivered models and pages cannot be turned against the viewer (moved to spec 002)

**Moved to `specs/002-delivery-security-headers/`** (its User Stories 1–3). The delivery protections — security response instructions on every response and SVG images delivered as downloads — are specified, planned and implemented there. The requirement and success-criterion numbers they had here (FR-019–FR-022, SC-004) are retired below so existing references remain unambiguous.

---

### User Story 4 - Games are never half-created (Priority: P2)

When game creation fails for any reason, the system leaves nothing behind: no orphaned games, no games without a model, no leftover files.

**Why this priority**: Without this, refused requests still produce broken games. Those games crash participants' screens and accumulate in storage.

**Independent Test**: Send each kind of invalid creation request, then verify the number of stored games and files has not changed.

**Acceptance Scenarios**:

1. **Given** any invalid creation request, **When** it is refused, **Then** the number of stored games and stored model files is unchanged.
2. **Given** a valid request where an unexpected failure happens after the game was registered, **When** the failure is handled, **Then** the partially created game is removed and a server error is returned.
3. **Given** a game created successfully, **When** someone lists games on the game service, **Then** the new game does not appear in any public game listing.

---

### User Story 5 - Facilitators get actionable errors (Priority: P3)

When a facilitator's own legitimate input is refused (for example an unusual model export), they get a specific message saying what was wrong and where, instead of a generic server failure.

**Why this priority**: Strict refusal can block legitimate but unusual exports. A precise message lets the facilitator fix the input or report the gap.

**Independent Test**: Submit a model with one unknown field on one element. Verify the response is a client error that names the diagram, the element position and the field, without echoing the submitted value.

**Acceptance Scenarios**:

1. **Given** input that breaks a validation rule, **When** creation is refused, **Then** the response is a client error that identifies the location of each problem but does not echo submitted content.
2. **Given** an unexpected internal failure, **When** creation fails, **Then** the response is a generic server error with no internal details.
3. **Given** any refused request, **When** it is refused, **Then** a security log entry is written with the reason, recorded so that log lines cannot be forged.

### Edge Cases

- **Threat Dragon chosen but no model supplied:** refused with a client error, and no game is created.
- **Model contains a field that marks it as an image model:** the field is discarded and never stored, so it cannot redirect image delivery to another game's file.
- **Model is a bare value (number, text, list) instead of a model:** refused.
- **Element identifiers with special characters or excessive length:** refused. Identifiers may contain only letters, digits, `_` and `-`, with at most 64 characters.
- **Image upload with more than one file, an empty file, or no file:** refused.
- **Clean SVG with unusual formatting** (comments, XML declaration, document type declaration, odd whitespace): accepted and stored in normalized form.
- **SVG made with an editor** (Inkscape metadata, draw.io HTML labels, Illustrator symbol references): accepted. Editor-specific or unsupported parts are removed. Where the editor provides a plain-text fallback (draw.io), that fallback is shown instead.
- **Image file name in upper case (`DIAGRAM.PNG`):** treated the same as lower case.
- **Participant list with fewer than 2 or more than 9 names, or with empty or duplicate names (after trimming spaces):** refused.

## Requirements *(mandatory)*

### Functional Requirements

**General input rules**

- **FR-001**: All game creation input MUST be checked against one shared, declarative set of rules. The same rules MUST be reusable by other parts of the product.
- **FR-002**: The system MUST complete all input checks before it registers a game, joins participants or stores anything. This includes the model or image check.
- **FR-003**: If a failure happens after a game was registered, the system MUST remove that game and all associated data and files.
- **FR-004**: The system MUST enforce these input rules:
  - 2–9 participants;
  - participant names non-empty after trimming, and unique;
  - turn duration a whole number from 0 to 3600 seconds, where 0 means no timer;
  - model reference optional, but if given it MUST be a secure web address (https);
  - exactly one file for image models.
- **FR-005**: New games MUST NOT appear in any public listing of games.

**Threat Dragon models**

- **FR-006**: A Threat Dragon model MUST be accepted only if it is valid structured data, has a text title, and has at least one diagram.
- **FR-007**: Descriptive metadata at the top level and diagram level that the product does not use MUST be discarded, not stored. Only the validated, declared content is stored.
- **FR-008**: Each diagram element MUST be one of: process, data store, actor, data flow, trust boundary. It MUST contain only the data properties defined for its type: identity, position, size, geometry, connections, threats, and the known Threat Dragon property flags. Any other property MUST cause refusal.
- **FR-009**: Element styling MUST be limited to the styling targets the product's diagram shapes use, and to the visual attributes those shapes use, with plain text or numeric values. Event handlers, embedded HTML content, link targets and any other attribute MUST cause refusal.
- **FR-010**: Connector labels MUST contain only a position and label text styling. Label-defined markup MUST cause refusal.
- **FR-011**: Threats embedded in a model MUST contain only the known threat fields, with text values.
- **FR-012**: Element identifiers MUST contain only letters, digits, `_` and `-`, with at most 64 characters.

**Image uploads**

- **FR-013**: The system MUST determine an uploaded image's type from its actual content. The type the uploader claims MUST match the detected type, otherwise the upload is refused.
- **FR-014**: If the uploaded file name has an extension, it MUST match the detected type, otherwise the upload is refused. The comparison ignores case, and `jpg`/`jpeg` are equivalent. A file name without an extension is allowed.
- **FR-015**: Only PNG, JPEG, GIF, WebP and SVG MUST be accepted. Any other content MUST be refused.
- **FR-016**: The stored file's type marker MUST be derived from the detected content type, never from the client-supplied name.
- **FR-017**: An SVG MUST be a well-formed XML document whose top-level element is an SVG drawing; otherwise it is refused. The system MUST remove all active content: scripts, event handlers, embedded foreign content, script links and animations that set links or handlers. It MUST store only its own cleaned serialization of the drawing element. The document prolog MUST be dropped: XML declaration, document type declaration with any entity or attribute definitions, processing instructions, and comments outside the drawing. Each removal MUST be logged as a security event. The original upload is never stored.
- **FR-018**: Temporary copies of uploaded files MUST be deleted when the request finishes, whether it succeeded or not.

**Delivery protections (moved to spec 002)**

- **FR-019–FR-022**: moved to `specs/002-delivery-security-headers/` (FR-001–FR-008 there). The numbers FR-019–FR-022 are retired here and stay reserved so existing references remain unambiguous.

**Error handling and logging**

- **FR-023**: Input that breaks a rule MUST produce a client error (400 class) that identifies where each problem is, without echoing submitted content. Unparseable model data and refused uploads MUST also produce client errors.
- **FR-024**: Unexpected failures MUST produce a generic server error with no internal details.
- **FR-025**: Every refused creation request MUST be logged as a security event, with all request-derived values encoded so that log entries cannot be forged.

**Compatibility**

- **FR-026**: Legitimate games created through the product's own creation page MUST keep working with no visible change. This applies to all four model types: Threat Dragon, image, the privacy-enhanced default model, and no model. In-page display of uploaded raster images and clean SVGs MUST be unchanged. SVGs lose only removed active or editor-specific parts.
- **FR-027**: The response format of a successful creation MUST stay unchanged: game identifier, participant credentials, spectator credential.

### Key Entities

- **Game creation request**: everything the facilitator submits: game mode, starting suit, model type, optional model reference, turn duration, participant names, and either a Threat Dragon model or one image file.
- **Threat Dragon model**: a title, optional descriptive metadata, and one or more diagrams. Each diagram holds elements of five types with geometry, connections, styling and threats.
- **Diagram element**: a process, data store, actor, data flow or trust boundary. It has an identifier, layout data, limited styling, optional label text and optional threats.
- **Uploaded image**: a single file whose stored type is determined by its content, and whose claimed type and name must not contradict that content.
- **Validation result**: either accepted, cleaned input, or a list of problem locations used for the client error and the security log.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the known injection and file-type payloads are neutralized, and no stored game or file contains executable content:
  - **Refused at creation, with no game or file stored:**
    - Threat Dragon payloads: element markup, tool markup, label markup, vertex and arrowhead markup, styling event handlers, embedded HTML, link targets;
    - PR #360 payloads: PHP declared as PNG, HTML declared as an image, SVG declared as PNG, a real PNG named `.php`/`.html`/`.sh`, a PNG declared as JPEG, an empty file;
    - malformed or non-SVG content claimed as SVG.
  - **Accepted, but stored with all active content removed:**
    - PR #358 payloads: SVGs with script, event handler, foreign content, script links, animation-based script links;
    - document-type entity tricks;
    - style sheet processing instructions.
- **SC-002**: 100% of the reference set of legitimate Threat Dragon exports and clean images (PNG, JPEG, GIF, WebP, SVG) are accepted and display the same as before.
- **SC-003**: After any refused request, the number of stored games and stored files is unchanged (0 orphans).
- **SC-004**: moved to `specs/002-delivery-security-headers/` (SC-001 there); the number stays reserved here.
- **SC-005**: Every refusal of invalid input returns a client error, never a server error, and produces exactly one security log entry.
- **SC-006**: Facilitators using the creation page see no change in how games are created or displayed, and need no new manual steps.

## Assumptions

- Only Threat Dragon version 1 exports are supported, since that is the format the product renders today. Version 2 exports are refused with a clear client error, as they effectively are today.
- A reference set of real Threat Dragon version 1 exports is available or will be gathered to confirm legitimate models are accepted. This is a prerequisite for SC-002.
- Refusing input is the chosen policy for Threat Dragon models, form fields and raster images. Unsafe content is never stored, and refusals are visible in logs.
- SVG drawings are the exception: they are cleaned and the cleaned copy is stored, as in PR #358. Testing showed that strict refusal would reject most SVGs made with common drawing tools (Inkscape, draw.io, Illustrator). Removals are logged, so attempts remain visible.
- Protection against resource exhaustion (size limits on fields, files, models and diagrams; restricting request formats) is deliberately not part of this feature. This follows the maintainer's review on PR #358 that DoS protection is not a priority at this point.
- Games stored before this change are not migrated, because current deployments do not keep game data across redeployments.
- When this feature is merged, PRs #358 and #360 are closed as superseded. Their test cases are carried over, with the expected status changed from server error to client error.
- The technical design (chosen libraries, code locations) is specified in the implementation plan (`/speckit.plan`). As requested in the PR #358 and #360 reviews, it relies on established libraries for file type and SVG detection.

## Out of Scope

These weaknesses were found in the same analysis but are not addressed here. They remain open and need separate follow-up:

- **Delivery protections** (security response instructions, content security policy, SVG image download delivery): extracted to `specs/002-delivery-security-headers/`, which supersedes this spec's former User Story 3, FR-019–FR-022 and SC-004.
- **Prototype pollution through in-game actions** (confirmed, high severity). Fixing it requires validating game action input.
- **Games created through the live game connection, bypassing the creation step** (high severity). Fixing it requires validating game setup in the game definition.
- **Unvalidated arguments to in-game actions:** out-of-range diagram indexes, and unrestricted editing of threat fields.
- **Resource exhaustion:** size and count limits, request format restrictions and rate limiting. Excluded per the maintainer's review (see Assumptions).
- **Other endpoint fixes:**
  - The image delivery endpoint does not check the game's model type. This would add defense in depth to the cross-game image access fix.
  - The participant listing exposes the spectator credential.
  - Report export escaping is incomplete.
- **Deployment hardening:** cross-origin policy, protection of the internal game service API, referrer policy, and credentials in links.
- **Client changes:** an error boundary, and how the model reference link is rendered.
