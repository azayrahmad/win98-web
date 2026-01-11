import { Pile } from "./Pile.js";

export class StockPile extends Pile {
  constructor(cards) {
    super();
    this.cards = cards;
  }

  canDeal() {
    return this.cards.length > 0;
  }

  deal(count = 1) {
    if (!this.canDeal()) {
      return count === 1 ? null : [];
    }

    if (count === 1) {
      return this.cards.pop();
    } else {
      const numToDeal = Math.min(count, this.cards.length);
      return this.cards.splice(-numToDeal).reverse();
    }
  }
}
