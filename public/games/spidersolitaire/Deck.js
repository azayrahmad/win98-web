const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const RANKS = [
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

class Deck {
  constructor(numberOfSuits = 1) {
    this.cards = this.createCards(numberOfSuits);
    this.shuffle();
  }

  createCards(numberOfSuits) {
    const selectedSuits = SUITS.slice(0, numberOfSuits);
    const sets = 104 / (RANKS.length * selectedSuits.length);
    const deck = [];

    for (let i = 0; i < sets; i++) {
      for (const suit of selectedSuits) {
        for (const rank of RANKS) {
          deck.push(new Card(suit, rank));
        }
      }
    }
    return deck;
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
}
