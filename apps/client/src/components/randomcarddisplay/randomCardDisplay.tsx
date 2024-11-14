import React from 'react';
import { Card, CARD_DECKS, GameMode, Suit } from '@eop/shared';
import { FC, useEffect, useState } from 'react';
import DealtCard from '../dealtcard/dealtcard';
import './randomCardDisplay.css';
import { Button, FormGroup, Input, Label } from 'reactstrap';

type SelectableCard = {
  card: Card;
  gameMode: GameMode;
};

const suites: Suit[] = ['A', 'B', 'C', 'D', 'E', 'T'];

const RandomCardDisplay: FC = () => {
  const allDecks = Object.keys(CARD_DECKS) as GameMode[];
  const [selectedDecks, setSelectedDecks] = useState<GameMode[]>(allDecks);
  const [selectedCard, setSelectedCard] = useState<SelectableCard | undefined>(
    undefined,
  );
  const selectableCards: SelectableCard[] = [];

  selectedDecks.forEach((deck) =>
    suites.forEach((suit) => {
      selectableCards.push(
        ...CARD_DECKS[deck][suit].cards.map((card) => ({
          card,
          gameMode: deck,
        })),
      );
    }),
  );

  const selectCard = () =>
    setSelectedCard(
      selectableCards[Math.floor(Math.random() * selectableCards.length)],
    );

  useEffect(() => {
    selectCard();
  }, []);

  const toggleCardDeck = (deck: GameMode) => {
    if (selectedDecks.includes(deck)) {
      setSelectedDecks(
        selectedDecks.filter((selectedDeck) => selectedDeck !== deck),
      );
    } else {
      setSelectedDecks(selectedDecks.concat(deck));
    }
  };

  return (
    <>
      <FormGroup check className="card-deck-selector-container">
        {allDecks.map((deck) => (
          <Label
            check
            className="card-deck-selection"
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
        <div className="card-container">
          <DealtCard
            gameMode={selectedCard.gameMode}
            card={selectedCard.card}
          />
        </div>
      )}
      <Button block size="lg" color="primary" onClick={() => selectCard()}>
        New Card
      </Button>
    </>
  );
};

export default RandomCardDisplay;
