export class Pile {
  constructor() {
    this.cards = [];
  }

  addCard(card) {
    this.cards.push(card);
  }

  removeCard() {
    return this.cards.pop();
  }

  get topCard() {
    return this.cards.length > 0 ? this.cards[this.cards.length - 1] : null;
  }
}
