import { Pile } from './pile.js';
import { RANKS } from './deck.js';

export class TableauPile extends Pile {
  constructor() {
    super();
  }

  canAccept(card) {
    if (this.cards.length === 0) {
      return true;
    }
    const topCard = this.topCard;
    const topCardRankIndex = RANKS.indexOf(topCard.rank);
    const newCardRankIndex = RANKS.indexOf(card.rank);
    return topCardRankIndex === newCardRankIndex + 1;
  }

  flipTopCard() {
    if (this.topCard && !this.topCard.faceUp) {
      this.topCard.faceUp = true;
      return true;
    }
    return false;
  }

  hasCompletedSet() {
    if (this.cards.length < 13) {
      return null;
    }

    const top13 = this.cards.slice(-13);
    const firstSuit = top13[0].suit;

    if (!top13.every((card) => card.suit === firstSuit && card.faceUp)) {
      return null;
    }

    for (let i = 0; i < RANKS.length; i++) {
      const rank = RANKS[RANKS.length - 1 - i]; // K, Q, J ... A
      if (top13[i].rank !== rank) {
        return null;
      }
    }

    return top13;
  }

  removeCompletedSet() {
    const completedSet = this.hasCompletedSet();
    if (completedSet) {
      this.cards.splice(-13);
      this.flipTopCard();
      return completedSet;
    }
    return null;
  }
}
