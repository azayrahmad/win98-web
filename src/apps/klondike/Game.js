import { Card } from "./Card.js";
import { TableauPile } from "./TableauPile.js";
import { StockPile } from "./StockPile.js";
import { FoundationPile } from "./FoundationPile.js";
import { WastePile } from "./WastePile.js";
import { getItem, setItem, LOCAL_STORAGE_KEYS } from "../../utils/localStorage.js";

export class Game {
  constructor() {
    this.initializeGame();
  }

  destroy() {
    this.allCards.forEach(card => card.destroy());
  }

  initializeGame() {
    this.previousState = null;
    this.cardBack = getItem(LOCAL_STORAGE_KEYS.KLONDIKE_CARD_BACK) || "cardback1";
    this.drawOption = getItem(LOCAL_STORAGE_KEYS.KLONDIKE_DRAW_OPTION) || "one";

    const suits = ["♥", "♦", "♠", "♣"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    this.allCards = [];
    let fullDeck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            const card = new Card(suit, rank, this.cardBack);
            fullDeck.push(card);
            this.allCards.push(card);
        }
    }

    for (let i = fullDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
    }

    this.deck = { cards: fullDeck };

    this.tableauPiles = Array.from({ length: 7 }, () => new TableauPile());
    this.foundationPiles = Array.from({ length: 4 }, () => new FoundationPile());
    this.wastePile = new WastePile();

    this.dealInitialCards();

    this.stockPile = new StockPile(this.deck.cards);
  }

  dealInitialCards() {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) {
        const card = this.deck.cards.pop();
        if (j === i) {
          card.faceUp = true;
        }
        this.tableauPiles[i].addCard(card);
      }
    }
  }

  dealFromStock() {
    if (this.stockPile.canDeal()) {
      this._saveState();
      if (this.drawOption === 'three') {
        const cardsToDeal = this.stockPile.deal(3);
        cardsToDeal.forEach(card => this.wastePile.addCard(card));
      } else {
        const card = this.stockPile.deal();
        this.wastePile.addCard(card);
      }
    } else if (this.wastePile.cards.length > 0) {
      this._saveState();
      const recycledCards = this.wastePile.reset();
      this.stockPile.cards.push(...recycledCards);
    }
  }

  flipTableauCard(pileIndex, cardIndex) {
      const pile = this.tableauPiles[pileIndex];
      if (pile && cardIndex === pile.cards.length - 1) {
          pile.flipTopCard();
          this.previousState = null;
      }
  }

  isValidMoveStack(pileType, pileIndex, cardIndex) {
      if (pileType === 'tableau') {
          const pile = this.tableauPiles[pileIndex];
          if (!pile || cardIndex < 0 || cardIndex >= pile.cards.length) return false;
          return pile.cards[cardIndex].faceUp;
      }
      if (pileType === 'waste') {
          const pile = this.wastePile;
          return cardIndex === pile.cards.length - 1;
      }
      if (pileType === 'foundation') {
          const pile = this.foundationPiles[pileIndex];
          return cardIndex === pile.cards.length - 1;
      }
      return false;
  }

  moveCards(fromPileType, fromPileIndex, cardIndex, toPileType, toPileIndex) {
    let fromPile;
    if (fromPileType === 'tableau') fromPile = this.tableauPiles[fromPileIndex];
    if (fromPileType === 'waste') fromPile = this.wastePile;
    if (fromPileType === 'foundation') fromPile = this.foundationPiles[fromPileIndex];

    let toPile;
    if (toPileType === 'tableau') toPile = this.tableauPiles[toPileIndex];
    if (toPileType === 'foundation') toPile = this.foundationPiles[toPileIndex];

    if (!fromPile || !toPile) return false;

    const cardsToMove = fromPile.cards.slice(cardIndex);

    if (cardsToMove.length > 0 && toPile.canAccept(cardsToMove[0])) {
      this._saveState();
      fromPile.cards.splice(cardIndex);
      toPile.cards.push(...cardsToMove);

      return true;
    }
    return false;
  }

  checkForWin() {
    return this.foundationPiles.every((pile) => pile.cards.length === 13);
  }

  setCardBack(cardBack) {
    this.cardBack = cardBack;
    setItem(LOCAL_STORAGE_KEYS.klondikeCardBack, cardBack);
    this.allCards.forEach(card => card.setCardBack(cardBack));
  }

  setDrawOption(option) {
    this.drawOption = option;
  }

  _saveState() {
    this.previousState = {
      stockPileCards: [...this.stockPile.cards],
      wastePileCards: [...this.wastePile.cards],
      tableauPilesCards: this.tableauPiles.map(p => [...p.cards]),
      foundationPilesCards: this.foundationPiles.map(p => [...p.cards]),
      allCardsFaceUp: this.allCards.map(c => c.faceUp)
    };
  }

  undo() {
    if (!this.previousState) {
      return;
    }

    this.stockPile.cards = this.previousState.stockPileCards;
    this.wastePile.cards = this.previousState.wastePileCards;
    this.tableauPiles.forEach((pile, index) => {
      pile.cards = this.previousState.tableauPilesCards[index];
    });
    this.foundationPiles.forEach((pile, index) => {
      pile.cards = this.previousState.foundationPilesCards[index];
    });

    this.allCards.forEach((card, index) => {
        card.faceUp = this.previousState.allCardsFaceUp[index];
    });

    this.previousState = null;
  }
}
