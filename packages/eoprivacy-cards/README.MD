Elevation of Privacy Integration

This document outlines what I, Gareth, did to integrate the Elevation of Privacy card deck into the Elevation of Privilege game, and how I did it. The purpose was to extend the functionality of the game to support new card packs with minimal disruption to the core mechanics.

🛠 What I Did

✅ Added the Elevation of Privacy Deck

I sourced the Elevation of Privacy pack from WithSecureOpenSource.

I created a combined JSON deck containing both Elevation of Privilege and Elevation of Privacy cards.

I included extended suits beyond the original ['A', 'B', 'C', 'D', 'E', 'T'], reaching up to ['A'..'J'].

✅ Updated Game Logic

I modified cardDefinitions.ts to handle new suits.

I added the new GameMode.EOPRIVACY to include the Elevation of Privacy deck.

I ensured T (Elevation of Privilege) remains the trump suit for Privacy mode.

✅ Created Custom Card Styles

I created eoprivacy_cards.jpg as a card sprite image.

I manually wrote eoprivacy_cards.css for each card class, positioning each card correctly using background-position.

I updated class names for card suits: f → t, g → f, h → g, i → h, j → i, keeping the second character (the value) intact.

✅ Pack Management Support

I made sure the deck supports enabling/disabling through admin UI (planned feature).

Deck definitions are stored in JSON format.

✅ Vite Build Fixes

I fixed a build error by ensuring the package @eop/eoprivacy-cards was correctly defined and style.css was present.

I added the required CSS import: import '@eop/eoprivacy-cards/style.css';.

I resolved Vite's inability to locate the CSS file by ensuring proper folder structure and Docker rebuilds.

✅ Final Testing

I rebuilt the Docker containers with --no-cache to ensure everything was clean.

I validated the build worked and the new cards rendered in the browser.


🧪 How I Did It

This was my step-by-step process:

Forked and cloned the repo from GitHub.

Created a new @eop/eoprivacy-cards package in the packages/ directory.

**Manually created the **eoprivacy_cards.css file with accurate background-position entries.

Built a combined JSON deck and manually verified suit extensions.

Updated game logic (cardDefinitions.ts) to include new suits and handle the new GameMode.

Ensured eoprivacy_cards.jpg was available and referenced in the CSS.

Added import statements for the new card styles.

**Installed dependencies locally with **npm install after resolving npm ci lockfile errors.

Rebuilt the project using docker compose build --no-cache.

Verified successful build and card rendering in-game.

✅ Integration complete!