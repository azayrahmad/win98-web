import { Card } from './card.js';
import { TableauPile } from './tableau-pile.js';
import { StockPile } from './stock-pile.js';
import { FoundationPile } from './foundation-pile.js';
import { WastePile } from './waste-pile.js';
import {
  getItem,
  setItem,
  LOCAL_STORAGE_KEYS,
} from '../../system/local-storage.js';

export class Game {
  constructor(initialVegasScore = 0) {
    this.initializeGame(initialVegasScore);
  }

  destroy() {
    this.stopTimer();
    this.allCards.forEach((card) => card.destroy());
  }

  initializeGame(initialVegasScore = 0) {
    this.previousState = null;
    this.cardBack =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_CARD_BACK) || "cardback1";
    this.drawOption = getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_DRAW_OPTION) || "one";
    this.scoring = getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_SCORING) || "standard";
    this.isTimedGame = getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_TIMED_GAME) === true;
    this.score = 0;
    this.vegasScore = -52 + initialVegasScore;
    this.recycleCount = 0;
    this.stockRecyclingDepleted = false;
    this.onScoreUpdate = () => {}; // Callback to notify UI of score changes
    this.onTimerUpdate = () => {};

    this.timerInterval = null;
    this.elapsedTime = 0;
    this.isTimerRunning = false;
    this.firstMoveMade = false;

    const suits = ["♥", "♦", "♠", "♣"];
    const ranks = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
    ];
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
    this.foundationPiles = Array.from(
      { length: 4 },
      () => new FoundationPile(),
    );
    this.wastePile = new WastePile();
    this.drawnCards = [];

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
    if (this.isTimedGame && !this.firstMoveMade) {
      this.firstMoveMade = true;
      this.startTimer();
    }
    this._saveState();

    if (this.stockPile.canDeal()) {
      // First, move existing drawn cards to the waste pile.
      this.wastePile.cards.push(...this.drawnCards);
      this.drawnCards = [];

      // Then, deal new cards.
      if (this.drawOption === "three") {
        const cardsToDeal = this.stockPile.deal(3);
        cardsToDeal.forEach((card) => (card.faceUp = true));
        this.drawnCards = cardsToDeal;
      } else {
        const card = this.stockPile.deal();
        if (card) {
          card.faceUp = true;
          this.drawnCards = [card];
        }
      }

      // Proactively check if the stock is now depleted under Vegas rules
      if (!this.stockPile.canDeal() && this.scoring === "vegas") {
        if (this.drawOption === "one") { // First and only pass is complete
          this.stockRecyclingDepleted = true;
        }
        if (this.drawOption === "three" && this.recycleCount >= 2) { // Final (3rd) pass is complete
          this.stockRecyclingDepleted = true;
        }
      }
    } else if (this.wastePile.cards.length > 0 || this.drawnCards.length > 0) {
      // This block handles the attempt to recycle the waste pile.
      if (this.scoring === "vegas") {
        if (this.drawOption === "one") {
          return; // No recycles allowed
        }
        if (this.drawOption === "three" && this.recycleCount >= 2) {
          return; // Max recycles reached
        }
      }

      this.recycleCount++;
      if (this.drawOption === "one" && this.recycleCount > 0) {
        this.updateScore(-100);
      } else if (this.drawOption === "three" && this.recycleCount % 4 === 0) {
        this.updateScore(-20);
      }

      // Recycle: take cards from both waste and drawn piles
      const recycledFromWaste = this.wastePile.reset();
      const recycledFromDrawn = this.drawnCards.reverse();
      this.drawnCards = [];

      // Combine recycled cards to form the new stock pile
      const allRecycledCards = [...recycledFromDrawn, ...recycledFromWaste];
      this.stockPile.cards = allRecycledCards;
      this.stockPile.cards.forEach((card) => (card.faceUp = false));

      // On a successful recycle, the stock is no longer considered depleted
      this.stockRecyclingDepleted = false;
    }
  }

  refillDrawnCardsFromWaste() {
    if (this.drawnCards.length === 0 && this.wastePile.cards.length > 0) {
      const cardToMove = this.wastePile.cards.pop();
      if (cardToMove) {
        this.drawnCards.push(cardToMove);
      }
    }
  }

  flipTableauCard(pileIndex, cardIndex) {
    const pile = this.tableauPiles[pileIndex];
    if (pile && cardIndex === pile.cards.length - 1) {
      this._saveState();
      if (pile.flipTopCard()) {
        this.updateScore(5);
      }
    }
  }

  isValidMoveStack(pileType, pileIndex, cardIndex) {
    if (pileType === "tableau") {
      const pile = this.tableauPiles[pileIndex];
      if (!pile || cardIndex < 0 || cardIndex >= pile.cards.length)
        return false;
      return pile.cards[cardIndex].faceUp;
    }
    if (pileType === "drawn") {
      return (
        this.drawnCards.length > 0 && cardIndex === this.drawnCards.length - 1
      );
    }
    if (pileType === "waste") {
      return (
        this.drawnCards.length === 0 &&
        this.wastePile.cards.length > 0 &&
        cardIndex === this.wastePile.cards.length - 1
      );
    }
    if (pileType === "foundation") {
      const pile = this.foundationPiles[pileIndex];
      return cardIndex === pile.cards.length - 1;
    }
    return false;
  }

  autoMoveCardToFoundation(fromPileType, fromPileIndex, cardIndex) {
    let fromPile;
    if (fromPileType === "tableau") {
      fromPile = this.tableauPiles[fromPileIndex];
    } else if (fromPileType === "drawn") {
      fromPile = { cards: this.drawnCards };
    } else if (fromPileType === "waste") {
      // This is a bit of a hack, drawnCards should be empty
      // for this to be valid.
      fromPile = this.wastePile;
    } else {
      return false;
    }

    if (!fromPile || cardIndex >= fromPile.cards.length) {
      return false;
    }

    // A move to the foundation is only valid if it's a single card from the top of a pile.
    if (cardIndex !== fromPile.cards.length - 1) {
      return false;
    }

    for (let i = 0; i < this.foundationPiles.length; i++) {
      if (this.isMoveValid(fromPileType, fromPileIndex, cardIndex, "foundation", i)) {
        return this.moveCards(fromPileType, fromPileIndex, cardIndex, "foundation", i);
      }
    }

    return false;
  }

  isMoveValid(fromPileType, fromPileIndex, cardIndex, toPileType, toPileIndex) {
    let fromPile;
    if (fromPileType === "tableau") fromPile = this.tableauPiles[fromPileIndex];
    else if (fromPileType === "drawn") fromPile = { cards: this.drawnCards };
    else if (fromPileType === "waste") fromPile = this.wastePile;
    else if (fromPileType === "foundation")
      fromPile = this.foundationPiles[fromPileIndex];
    else return false;

    let toPile;
    if (toPileType === "tableau") toPile = this.tableauPiles[toPileIndex];
    else if (toPileType === "foundation")
      toPile = this.foundationPiles[toPileIndex];
    else return false;

    if (!fromPile || !toPile) return false;

    // Check if there are cards to move from the specified index
    if (cardIndex >= fromPile.cards.length) return false;

    const cardsToMove = fromPile.cards.slice(cardIndex);

    if (cardsToMove.length > 0 && toPile.canAccept(cardsToMove[0])) {
      return true;
    }

    return false;
  }

  moveCards(fromPileType, fromPileIndex, cardIndex, toPileType, toPileIndex) {
    let fromPile;
    if (fromPileType === "tableau") fromPile = this.tableauPiles[fromPileIndex];
    if (fromPileType === "drawn") fromPile = { cards: this.drawnCards };
    if (fromPileType === "waste") fromPile = this.wastePile;
    if (fromPileType === "foundation")
      fromPile = this.foundationPiles[fromPileIndex];

    let toPile;
    if (toPileType === "tableau") toPile = this.tableauPiles[toPileIndex];
    if (toPileType === "foundation") toPile = this.foundationPiles[toPileIndex];

    if (!fromPile || !toPile) return false;

    const cardsToMove = fromPile.cards.slice(cardIndex);

    if (cardsToMove.length > 0 && toPile.canAccept(cardsToMove[0])) {
      if (this.isTimedGame && !this.firstMoveMade) {
        this.firstMoveMade = true;
        this.startTimer();
      }
      this._saveState();
      fromPile.cards.splice(cardIndex);
      toPile.cards.push(...cardsToMove);

      if (fromPileType === "drawn") {
        this.refillDrawnCardsFromWaste();
      }

      // Scoring logic
      if (toPileType === "foundation") {
        this.vegasScore += 5;
        this.updateScore(10);
      } else if (fromPileType === "foundation" && toPileType === "tableau") {
        this.vegasScore -= 5;
        this.updateScore(-15);
      } else if (fromPileType === "drawn" && toPileType === "tableau") {
        this.updateScore(5);
      }
      return true;
    }
    return false;
  }

  checkForWin() {
    return this.foundationPiles.every((pile) => pile.cards.length === 13);
  }

  updateScore(points) {
    this.score += points;
    if (this.score < 0) {
      this.score = 0;
    }
    this.onScoreUpdate({
      standard: this.score,
      vegas: this.vegasScore,
    });
  }

  startTimer() {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      this.elapsedTime++;
      this.onTimerUpdate(this.elapsedTime);
      if (this.elapsedTime % 10 === 0) {
        if (this.score > 1) {
          this.updateScore(-2);
        }
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
    this.isTimerRunning = false;
  }

  pauseTimer() {
    if (this.isTimerRunning) {
      clearInterval(this.timerInterval);
      this.isTimerRunning = false;
    }
  }

  resumeTimer() {
    if (!this.isTimerRunning && this.firstMoveMade) {
      this.startTimer();
    }
  }

  setCardBack(cardBack) {
    this.cardBack = cardBack;
    setItem(LOCAL_STORAGE_KEYS.SOLITAIRE_CARD_BACK, cardBack);
    this.allCards.forEach((card) => card.setCardBack(cardBack));
  }

  setDrawOption(option) {
    this.drawOption = option;
  }

  _saveState() {
    this.previousState = {
      stockPileCards: [...this.stockPile.cards],
      wastePileCards: [...this.wastePile.cards],
      drawnCards: [...this.drawnCards],
      tableauPilesCards: this.tableauPiles.map((p) => [...p.cards]),
      foundationPilesCards: this.foundationPiles.map((p) => [...p.cards]),
      allCardsFaceUp: this.allCards.map((c) => c.faceUp),
      score: this.score,
      vegasScore: this.vegasScore,
      recycleCount: this.recycleCount,
    };
  }

  undo() {
    if (!this.previousState) {
      return;
    }

    this.stockPile.cards = this.previousState.stockPileCards;
    this.wastePile.cards = this.previousState.wastePileCards;
    this.drawnCards = this.previousState.drawnCards;
    this.tableauPiles.forEach((pile, index) => {
      pile.cards = this.previousState.tableauPilesCards[index];
    });
    this.foundationPiles.forEach((pile, index) => {
      pile.cards = this.previousState.foundationPilesCards[index];
    });

    this.allCards.forEach((card, index) => {
      card.faceUp = this.previousState.allCardsFaceUp[index];
    });

    this.score = this.previousState.score;
    this.vegasScore = this.previousState.vegasScore;
    this.recycleCount = this.previousState.recycleCount;
    this.onScoreUpdate({
      standard: this.score,
      vegas: this.vegasScore,
    });

    this.previousState = null;
  }
}
