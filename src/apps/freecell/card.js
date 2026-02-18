export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export class Card {
  constructor(suit, rank, cardBack) {
    this.suit = suit;
    this.rank = rank;
    this._faceUp = false;
    this.cardBack = cardBack;
    this.uid = 'card-' + Math.random().toString(36).substr(2, 9);
    this._createElement();
  }

  destroy() {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }

  _createElement() {
    const suitMap = {
      "♥": "heart",
      "♦": "diamond",
      "♠": "spade",
      "♣": "club",
    };
    const suitName = suitMap[this.suit] || this.suit;

    this.element = document.createElement("div");
    this.element.className = "card";
    this.element.setAttribute("data-rank", this.rank);
    this.element.setAttribute("data-suit", suitName);
    this.element.dataset.uid = this.uid;

    this._updateElementFace();
  }

  _updateElementFace() {
      if (this._faceUp) {
          this.element.classList.add("face-up");
          this.element.classList.remove("face-down");
          const rankMap = { A: "Ace", K: "King", Q: "Queen", J: "Jack" };
          const rankName = rankMap[this.rank] || this.rank;
          const suitLabel = this.element.getAttribute("data-suit").charAt(0).toUpperCase() + this.element.getAttribute("data-suit").slice(1);
          this.element.setAttribute("aria-label", `${rankName} of ${suitLabel}s`);
      } else {
          this.element.classList.add("face-down");
          this.element.classList.remove("face-up");
          this.element.classList.add(this.cardBack);
          this.element.removeAttribute("aria-label");
      }
  }

  get faceUp() {
      return this._faceUp;
  }

  set faceUp(value) {
      if (this._faceUp !== value) {
          this._faceUp = value;
          this._updateElementFace();
      }
  }

  setCardBack(newCardBack) {
    if (this.cardBack) {
      this.element.classList.remove(this.cardBack);
    }
    this.cardBack = newCardBack;
    if (!this.faceUp) {
      this.element.classList.add(this.cardBack);
    }
  }

  toJSON() {
    return {
      suit: this.suit,
      rank: this.rank,
      faceUp: this.faceUp,
      uid: this.uid,
    };
  }
}
