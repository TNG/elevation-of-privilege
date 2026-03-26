# Game Flow

High-level overview of how the threat modeling game works.

## Game Purpose

Players work together to identify security threats in a system architecture. A card-based mechanic guides collaborative brainstorming - each card played prompts everyone to think about a specific type of attack (e.g., Spoofing, Tampering, Elevation of Privilege).

## Gameplay Loop

The game repeats this sequence:

1. **Card Play**: Current player plays a card from their hand
2. **Threat Discovery**: All players collaborate to identify threats matching the card's type
3. **Trick Completion**: Round ends when done, winner leads next

This continues until all rounds are played.

## Creating a Game

**Tip**: The easiest way to start a game is using **Privacy Enhanced** mode - it doesn't require uploading any files or creating complex models, just enter player names and play.

1. Navigate to game creation page
2. Configure:
   - 3-8 players with names
   - Game mode (EoP, Cornucopia, Cumulus, or MLsec)
   - Starting suit (changes first card played)
   - Turn timer (optional: 3, 5, or 10 minutes)
   - Architectural model:
     - **Image**: Upload a diagram/image - threats apply to whole model
     - **Privacy Enhanced**: No file upload - suitable for sensitive systems (recommended for quick setup)
     - **Threat Dragon**: Upload JSON model - threats attach to specific components
3. Click "Proceed" to get unique URLs for each player and a spectator URL

## Playing the Game

### Card Play Phase
- Only the current player (highlighted in status) can play cards
- Valid cards are highlighted in their hand:
  - Cards matching the current suit, OR
  - In the first round, can play any card
- Playing a card starts the threat discovery phase for everyone

### Threat Discovery Phase (The Core Gameplay)
This is where players brainstorm and document threats together.

**All players can simultaneously:**
- Select different parts of the architectural model
- Add threats by clicking the active card or "Add Threat" button
- Edit or delete threats they authored

**Threat cards include:**
- Pre-filled description template about that attack type
- Fields for title, severity, and mitigation
- Threats attach to the selected model component

**Passing:**
- Players pass when done brainstorming
- Passed players can observe but not modify in that round
- Round continues until everyone has passed

**Scoring:**
- +1 point for each threat you document
- Trick winner gets +1 point (see below)

### Trick Completion
When all players have passed, the trick ends:
- Highest card in the trick wins (based on game-specific card values)
- Winner leads the next trick
- Player with highest total score (tricks + threats) wins the game
- Game ends after each player has played all their cards

## Architectural Models

### Image Model
- Upload any image file
- No structured components
- All threats attach to the model as a whole

### Privacy Enhanced Model
- No file upload required
- Optional: Link to external model location
- Uses default placeholders
- Best when architectural docs are sensitive/confidential

### Threat Dragon Model
- Upload JSON exported from [OWASP Threat Dragon](https://owasp.org/www-project-threat-dragon/)
- Selectable components on diagrams
- Threats attach to specific components
- Enables precise mapping of threats to system elements

## Spectator Mode

- Observers watch gameplay via spectator URL
- View all threats, cards, and scores
- Cannot play cards or add/edit threats
- Useful for moderators or training

## Exporting Results

After the game, players can download:
- **Threat Dragon Model**: JSON with all threats embedded in components
- **Markdown Report**: Human-readable list of all threats with details

## Key Rules

- **Parallel discovery**: Once a card is played, ALL players can add threats simultaneously (not turn-based)
- **Card limitations**: Only the lead player can play cards once per round
- **Threat ownership**: Each threat has an author who can edit/delete it later
- **Suit matching**: Must play cards matching the current suit (except first trick)
- **Trick winner**: Determines who leads the next turn

## Scoring Summary

- **Trick wins**: +1 point
- **Threat identified**: +1 point
- **Winner**: Highest total score at game end

---

## Drawing Random Cards

A standalone feature for browsing cards outside of gameplay.

To use:
- Click "Draw a random card" on the game creation page
- Select which card decks (EoP, Cornucopia, Cumulus, MLsec) to include
- Click "New Card" to draw a random card from selected decks
- Cards can be viewed for learning/training purposes without starting a game