import { Pile } from './pile.js';
import { RANKS } from './card.js';

export class FoundationPile extends Pile {
  constructor() {
    super();
  }

  canAccept(card) {
    if (this.cards.length === 0) {
      return card.rank === "A";
    }

    const topCard = this.topCard;
    const topCardRankIndex = RANKS.indexOf(topCard.rank);
    const newCardRankIndex = RANKS.indexOf(card.rank);

    return topCard.suit === card.suit && newCardRankIndex === topCardRankIndex + 1;
  }
}
