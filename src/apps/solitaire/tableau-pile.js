import { Pile } from './pile.js';
import { RANKS } from './card.js';

export class TableauPile extends Pile {
  constructor() {
    super();
  }

  canAccept(card) {
    if (this.cards.length === 0) {
      return card.rank === "K";
    }

    const topCard = this.topCard;
    if (!topCard.faceUp) {
      return false;
    }

    const topCardRankIndex = RANKS.indexOf(topCard.rank);
    const newCardRankIndex = RANKS.indexOf(card.rank);

    const topCardIsRed = topCard.suit === "♥" || topCard.suit === "♦";
    const newCardIsRed = card.suit === "♥" || card.suit === "♦";

    return topCardIsRed !== newCardIsRed && topCardRankIndex === newCardRankIndex + 1;
  }

  flipTopCard() {
    if (this.topCard && !this.topCard.faceUp) {
      this.topCard.faceUp = true;
      return true;
    }
    return false;
  }
}
