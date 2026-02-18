import { RANKS } from './card.js';

const CARD_WIDTH = 71;
const CARD_HEIGHT = 96;
const SUIT_MAP = { "♠": 0, "♥": 1, "♣": 2, "♦": 3 };

class AnimatedCard {
  constructor(card, spriteSheet, x, y) {
    this.card = card;
    this.spriteSheet = spriteSheet;
    this.x = x;
    this.y = y;
    // Choose left or right
    const direction = Math.random() < 0.5 ? -1 : 1;

    // Angle: 0–30 degrees from horizontal
    const angleDeg = Math.random() * 30;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Speed
    const speed = 1 + Math.random() * 6;

    // Velocity
    this.vx = Math.cos(angleRad) * speed * direction;
    this.vy = -Math.sin(angleRad) * speed;

    const rankIndex = RANKS.indexOf(card.rank);
    const suitIndex = SUIT_MAP[card.suit];
    this.spriteX = rankIndex * CARD_WIDTH;
    this.spriteY = suitIndex * CARD_HEIGHT;
  }
}

export class WinAnimation {
  constructor(canvas, foundationPiles, onComplete) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.foundationPiles = foundationPiles;
    this.onComplete = onComplete;

    this.cardQueue = [];
    this.activeCard = null;
    this.animationFrameId = null;
    this.isSkipped = false;
    this.spriteSheet = null;

    this.boundSkip = this.skip.bind(this);
  }

  async start() {
    this.canvas.addEventListener("click", this.boundSkip);
    this.canvas.style.display = "block";

    await this._loadSpriteSheet();
    this._prepareCardQueue();
    this._animate();
  }

  skip() {
    if (this.isSkipped) return;
    this.isSkipped = true;
    cancelAnimationFrame(this.animationFrameId);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.destroy();
    if (this.onComplete) {
      this.onComplete();
    }
  }

  destroy() {
    this.canvas.removeEventListener("click", this.boundSkip);
    this.canvas.style.display = "none";
  }

  _loadSpriteSheet() {
    return new Promise((resolve) => {
      this.spriteSheet = new Image();
      this.spriteSheet.onload = () => resolve();
      this.spriteSheet.src = new URL("./assets/solitaire.png", import.meta.url).href;
    });
  }

  _prepareCardQueue() {
    const allCards = this.foundationPiles.flatMap((pile) => pile.cards);

    const rankOrder = [...RANKS].reverse();

    this.cardQueue = allCards.sort((a, b) => {
      const rankComparison =
        rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
      if (rankComparison !== 0) {
        return rankComparison;
      }
      return a.suit.localeCompare(b.suit);
    });
  }

  _animate() {
    if (this.isSkipped) return;

    if (!this.activeCard && this.cardQueue.length > 0) {
      const nextCard = this.cardQueue.shift();
      const foundationPileElement = document.querySelector(
        `.foundation-pile .card[data-uid="${nextCard.uid}"]`,
      ).parentElement;
      const rect = foundationPileElement.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();
      const startX = rect.left - canvasRect.left;
      const startY = rect.top - canvasRect.top;
      this.activeCard = new AnimatedCard(
        nextCard,
        this.spriteSheet,
        startX,
        startY,
      );
    }

    if (this.activeCard) {
      this.activeCard.vy += 0.5; // Gravity
      this.activeCard.x += this.activeCard.vx;
      this.activeCard.y += this.activeCard.vy;

      if (this.activeCard.y + CARD_HEIGHT > this.canvas.height) {
        this.activeCard.vy *= -0.9;
        this.activeCard.y = this.canvas.height - CARD_HEIGHT;
      }

      this.ctx.drawImage(
        this.spriteSheet,
        this.activeCard.spriteX,
        this.activeCard.spriteY,
        CARD_WIDTH,
        CARD_HEIGHT,
        this.activeCard.x,
        this.activeCard.y,
        CARD_WIDTH,
        CARD_HEIGHT,
      );

      const isOffScreen =
        this.activeCard.x < -CARD_WIDTH ||
        this.activeCard.x > this.canvas.width;

      if (isOffScreen) {
        this.activeCard = null;
      }
    }

    if (!this.activeCard && this.cardQueue.length === 0) {
      this.skip();
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => this._animate());
  }
}
