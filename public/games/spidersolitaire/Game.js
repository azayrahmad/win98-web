class Game {
  constructor(numberOfSuits = 1) {
    this.numberOfSuits = numberOfSuits;
    this.deck = new Deck(this.numberOfSuits);
    this.tableauPiles = Array.from({ length: 10 }, () => new TableauPile());
    this.foundationPiles = Array.from(
      { length: 8 },
      () => new FoundationPile(),
    );
    this.history = [];
    this.initializeGame();
    this.saveInitialState();
  }

  _deepCloneCards(cards) {
    return cards.map((card) => {
      const newCard = new card.constructor(card.suit, card.rank);
      newCard.faceUp = card.faceUp;
      newCard.uid = card.uid;
      return newCard;
    });
  }

  saveInitialState() {
    this.initialState = {
      tableauPiles: this.tableauPiles.map((pile) => {
        const newPile = new pile.constructor();
        newPile.cards = this._deepCloneCards(pile.cards);
        return newPile;
      }),
      stockPileCards: this._deepCloneCards(this.stockPile.cards),
    };
  }

  restartGame() {
    this.clearHistory();
    this.score = 500;
    this.moves = 0;
    this.completedSetsBySuit = {
      spades: 0,
      hearts: 0,
      diamonds: 0,
      clubs: 0,
    };
    this.foundationPiles = Array.from(
      { length: 8 },
      () => new FoundationPile(),
    );

    this.tableauPiles = this.initialState.tableauPiles.map((pile) => {
      const newPile = new pile.constructor();
      newPile.cards = this._deepCloneCards(pile.cards);
      return newPile;
    });
    this.stockPile.cards = this._deepCloneCards(this.initialState.stockPileCards);
  }

  clearHistory() {
    this.history = [];
  }

  initializeGame() {
    this.clearHistory();
    this.score = 500;
    this.moves = 0;
    this.completedSetsBySuit = {
      spades: 0,
      hearts: 0,
      diamonds: 0,
      clubs: 0,
    };
    this.dealInitialCards();
    // The rest of the deck becomes the stock
    this.stockPile = new StockPile(this.deck.cards);
  }

  dealInitialCards() {
    // 44 cards are dealt face down to the tableau
    for (let i = 0; i < 44; i++) {
      const card = this.deck.cards.pop();
      const pileIndex = i % 10;
      this.tableauPiles[pileIndex].addCard(card);
    }
  }

  dealFromStock() {
    if (this.tableauPiles.some((pile) => pile.cards.length === 0)) {
      return { success: false, reason: "EMPTY_PILE" };
    }

    if (this.stockPile.canDeal()) {
      this.clearHistory();
      const cardsToDeal = this.stockPile.deal();
      return { success: true, cards: cardsToDeal };
    }
    return { success: false, reason: "NO_STOCK" };
  }

  addDealtCardsToTableau(cards) {
    cards.forEach((card, index) => {
      card.faceUp = true;
      this.tableauPiles[index].addCard(card);
    });
  }

  moveCards(fromPileIndex, cardIndex, toPileIndex) {
    const fromPile = this.tableauPiles[fromPileIndex];
    const toPile = this.tableauPiles[toPileIndex];
    const cardsToMove = fromPile.cards.slice(cardIndex);

    if (cardsToMove.length > 0 && toPile.canAccept(cardsToMove[0])) {
      const topCardOfFromPile =
        cardIndex > 0 ? fromPile.cards[cardIndex - 1] : null;
      const wasFlipped = topCardOfFromPile ? !topCardOfFromPile.faceUp : false;

      this.history.push({
        fromPileIndex,
        toPileIndex,
        cards: cardsToMove,
        wasFlipped,
      });

      // Move cards
      fromPile.cards.splice(cardIndex);
      toPile.cards.push(...cardsToMove);

      // Flip the new top card of the source pile
      fromPile.flipTopCard();

      this.moves++;
      this.score--;

      return true;
    }
    return false;
  }

  isValidMoveStack(pileIndex, cardIndex) {
    const pile = this.tableauPiles[pileIndex];
    if (!pile || cardIndex < 0 || cardIndex >= pile.cards.length) {
      return false;
    }

    const stack = pile.cards.slice(cardIndex);

    // All cards in the stack must be face up and of the same suit.
    const firstSuit = stack[0].suit;
    if (!stack.every((card) => card.faceUp && card.suit === firstSuit)) {
      return false;
    }

    // Check for descending rank order.
    for (let i = 0; i < stack.length - 1; i++) {
      const currentRankIndex = RANKS.indexOf(stack[i].rank);
      const nextRankIndex = RANKS.indexOf(stack[i + 1].rank);
      if (currentRankIndex !== nextRankIndex + 1) {
        return false;
      }
    }

    return true;
  }

  checkForCompletedSets(pileIndex) {
    const pile = this.tableauPiles[pileIndex];
    const completedSet = pile.checkForCompletedSet();

    if (completedSet) {
      const emptyFoundation = this.foundationPiles.find(
        (p) => p.cards.length === 0,
      );
      if (emptyFoundation) {
        const suitSymbol = completedSet[0].suit;
        const suitName = {
          "♠️": "spades",
          "♥️": "hearts",
          "♦️": "diamonds",
          "♣️": "clubs",
        }[suitSymbol];

        if (suitName) {
          this.completedSetsBySuit[suitName]++;
        }
        emptyFoundation.addSet(completedSet);

        const lastMove = this.history[this.history.length - 1];
        if (lastMove) {
          lastMove.completedSet = {
            cards: completedSet,
            fromPileIndex: pileIndex,
            foundationPileIndex: this.foundationPiles.indexOf(emptyFoundation),
          };
        }

        this.score += 100;
        this.clearHistory();
        return true;
      }
    }
    return false;
  }

  checkForWin() {
    return this.foundationPiles.every((pile) => pile.cards.length > 0);
  }

  findAllAvailableMoves() {
    const moves = [];
    // Check for moves between tableau piles
    this.tableauPiles.forEach((fromPile, fromPileIndex) => {
      if (fromPile.cards.length === 0) return;

      for (let i = 0; i < fromPile.cards.length; i++) {
        if (this.isValidMoveStack(fromPileIndex, i)) {
          const cardToMove = fromPile.cards[i];
          this.tableauPiles.forEach((toPile, toPileIndex) => {
            if (fromPileIndex !== toPileIndex && toPile.canAccept(cardToMove)) {
              moves.push({ fromPileIndex, cardIndex: i, toPileIndex });
            }
          });
        }
      }
    });
    return moves;
  }

  undo() {
    if (this.history.length === 0) {
      return false;
    }

    const lastMove = this.history.pop();
    const { fromPileIndex, toPileIndex, cards, wasFlipped, completedSet } =
      lastMove;

    // Reverse the main card movement
    const fromPile = this.tableauPiles[fromPileIndex];
    const toPile = this.tableauPiles[toPileIndex];

    const startIndex = toPile.cards.length - cards.length;
    toPile.cards.splice(startIndex);

    fromPile.cards.push(...cards);

    if (wasFlipped) {
      const topCardIndex = fromPile.cards.length - cards.length - 1;
      if (topCardIndex >= 0) {
        fromPile.cards[topCardIndex].faceUp = false;
      }
    }

    this.moves++;
    return true;
  }

  toJSON() {
    return {
      numberOfSuits: this.numberOfSuits,
      tableauPiles: this.tableauPiles.map((pile) =>
        pile.cards.map((card) => card.toJSON()),
      ),
      foundationPiles: this.foundationPiles.map((pile) =>
        pile.cards.map((card) => card.toJSON()),
      ),
      stockPile: this.stockPile.cards.map((card) => card.toJSON()),
      score: this.score,
      moves: this.moves,
      completedSetsBySuit: this.completedSetsBySuit,
      initialState: {
        tableauPiles: this.initialState.tableauPiles.map((pile) =>
          pile.cards.map((card) => card.toJSON()),
        ),
        stockPileCards: this.initialState.stockPileCards.map((card) =>
          card.toJSON(),
        ),
      },
    };
  }

  static fromJSON(json) {
    const game = new Game(json.numberOfSuits);

    const createCardFromJSON = (cardData) => {
      const card = new Card(cardData.suit, cardData.rank);
      card.faceUp = cardData.faceUp;
      card.uid = cardData.uid;
      return card;
    };

    game.score = json.score;
    game.moves = json.moves;
    game.completedSetsBySuit = json.completedSetsBySuit;

    game.tableauPiles = json.tableauPiles.map((pileData) => {
      const pile = new TableauPile();
      pile.cards = pileData.map(createCardFromJSON);
      return pile;
    });

    game.foundationPiles = json.foundationPiles.map((pileData) => {
      const pile = new FoundationPile();
      pile.cards = pileData.map(createCardFromJSON);
      return pile;
    });

    game.stockPile = new StockPile(json.stockPile.map(createCardFromJSON));

    game.initialState = {
      tableauPiles: json.initialState.tableauPiles.map((pileData) => {
        const pile = new TableauPile();
        pile.cards = pileData.map(createCardFromJSON);
        return pile;
      }),
      stockPileCards: json.initialState.stockPileCards.map(createCardFromJSON),
    };

    game.history = [];

    return game;
  }
}
