class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.faceUp = false;
    this.uid = 'card-' + Math.random().toString(36).substr(2, 9);
  }

  get element() {
    const suitMap = {
      "♠️": "spade",
      "♥️": "heart",
      "♦️": "diamond",
      "♣️": "club",
    };
    const suitName = suitMap[this.suit] || this.suit;

    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.setAttribute("data-rank", this.rank);
    cardDiv.setAttribute("data-suit", suitName);
    cardDiv.dataset.uid = this.uid;

    if (this.faceUp) {
      cardDiv.classList.add("face-up");
      const rankMap = {
        A: "Ace",
        K: "King",
        Q: "Queen",
        J: "Jack",
      };
      const rankName = rankMap[this.rank] || this.rank;
      const suitLabel = suitName.charAt(0).toUpperCase() + suitName.slice(1);
      cardDiv.setAttribute("aria-label", `${rankName} of ${suitLabel}s`);
    } else {
      cardDiv.classList.add("face-down");
    }

    return cardDiv;
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
