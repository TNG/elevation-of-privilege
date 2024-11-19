import React from 'react';
import { CARD_DECKS, GameMode, SUITS } from '@eop/shared';
import { FC, useState } from 'react';
import DealtCard from '../dealtcard/dealtcard';
import classes from './randomCardDisplay.module.css';
import { Button, FormGroup, Input, Label } from 'reactstrap';

const allDecks = Object.keys(CARD_DECKS) as GameMode[];
const RandomCardDisplay: FC = () => {
  const [selectedDecks, setSelectedDecks] = useState<GameMode[]>(allDecks);
  const selectableCards = selectedDecks.flatMap((deck) =>
    SUITS.flatMap((suit) =>
      CARD_DECKS[deck][suit].cards.map((card) => ({
        card,
        gameMode: deck,
      })),
    ),
  );
  const getRandomSelectableCard = () =>
    selectableCards[Math.floor(Math.random() * selectableCards.length)];
  const [selectedCard, setSelectedCard] = useState(getRandomSelectableCard());
  const selectCard = () => setSelectedCard(getRandomSelectableCard());
  const toggleCardDeck = (deck: GameMode) =>
    setSelectedDecks((selectedDecks) =>
      selectedDecks.includes(deck)
        ? selectedDecks.filter((selectedDeck) => selectedDeck !== deck)
        : [...selectedDecks, deck],
    );

  return (
    <>
      <FormGroup check className={classes['card-deck-selector-container']}>
        {allDecks.map((deck) => (
          <Label
            check
            className={classes['card-deck-selection']}
            key={`card-deck-selector-${deck}`}
          >
            <Input
              id="radio-button-default-model"
              type="checkbox"
              onChange={() => toggleCardDeck(deck)}
              checked={selectedDecks.includes(deck)}
            />
            {deck}
          </Label>
        ))}
      </FormGroup>
      {selectedCard && (
        <div className={classes['card-container']}>
          <DealtCard
            gameMode={selectedCard.gameMode}
            card={selectedCard.card}
          />
        </div>
      )}
      <Button block size="lg" color="primary" onClick={selectCard}>
        New Card
      </Button>
    </>
  );
};

export default RandomCardDisplay;
