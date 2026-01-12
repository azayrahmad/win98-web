class StockPile extends Pile {
  constructor(cards) {
    super();
    this.cards = cards;
  }

  canDeal() {
    return this.cards.length > 0;
  }

  deal() {
    if (!this.canDeal()) {
      return [];
    }
    // Spider solitaire deals 10 cards at a time
    return this.cards.splice(-10);
  }
}
