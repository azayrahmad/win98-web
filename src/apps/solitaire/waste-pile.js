import { Pile } from './pile.js';

export class WastePile extends Pile {
  constructor() {
    super();
  }

  addCard(card) {
    if (card) {
      card.faceUp = true;
      this.cards.push(card);
    }
  }

  reset() {
    const cards = this.cards.reverse().map((card) => {
      card.faceUp = false;
      return card;
    });
    this.cards = [];
    return cards;
  }
}
