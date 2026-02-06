import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { Game } from './game.js';
import { WinAnimation } from './win-animation.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import {
  getItem,
  setItem,
  LOCAL_STORAGE_KEYS,
} from '../../system/local-storage.js';
import { findBestDropTarget } from '../../apps/solitaire/solitaire-helper.js';
import "./solitaire.css";
import "./options.css";
import "./solitaire-shared.css";
import { preloadImage } from '../../system/asset-preloader.js';
import solitaireSprite from "./assets/solitaire.png";

const animatedCardBacks = {
  "cardback-robot1": { frames: 3, prefix: "cardback-robot" },
  "cardback-hand1": { frames: 3, prefix: "cardback-hand" },
  "cardback-castle1": { frames: 2, prefix: "cardback-castle" },
  "cardback-beach1": { frames: 3, prefix: "cardback-beach" },
};

export class SolitaireApp extends Application {
  static config = {
    id: "solitaire",
    title: "Solitaire",
    width: 700,
    height: 600,
    resizable: true,
    icon: ICONS.solitaire,
  };

  async _createWindow() {
    await preloadImage(solitaireSprite);

    const win = new window.$Window({
      title: this.config.title,
      outerWidth: this.config.width,
      outerHeight: this.config.height,
      resizable: this.config.resizable,
      icons: this.icon,
    });

    this._updateMenuBar(win);

    win.element.querySelector(".window-content").innerHTML = `
      <div class="solitaire-container">
        <div class="game-board">
        <canvas class="win-animation-canvas"></canvas>
          <div class="top-piles">
            <div class="stock-pile"></div>
            <div class="waste-pile-container">
              <div class="waste-pile"></div>
              <div class="drawn-card-pile"></div>
            </div>
            <div class="spacer"></div>
            <div class="foundation-piles"></div>
          </div>
          <div class="tableau-piles"></div>
        </div>
        <div class="status-bar">
          <span id="solitaire-timer">Time: 0</span>
          <span id="solitaire-score">Score: 0</span>
        </div>
      </div>
    `;

    this.win = win;
    this.container = win.element.querySelector(".solitaire-container");
    this.container.classList.add("style-98");

    this.isDragging = false;
    this.draggedElement = null;
    this.draggedCardsInfo = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.outlineDraggingEnabled =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_OUTLINE_DRAGGING) === true;
    this.hoveredTarget = null;

    this.cumulativeVegasScore = 0;
    this.lastClickTime = 0;
    this.lastClickedCardUid = null;
    this.doubleClickThreshold = 400;

    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnClick = this.onClick.bind(this);

    this.animationTimer = null;

    this.addEventListeners();

    this._updateStatusBarVisibility();
    this.startNewGame();

    win.on("close", () => {
      clearInterval(this.animationTimer);
      if (this.game) {
        this.game.stopTimer();
      }
      this.removeEventListeners();
    });

    win.on("minimize", () => {
      if (this.game) {
        this.game.pauseTimer();
      }
    });

    win.on("restore", () => {
      if (this.game) {
        this.game.resumeTimer();
      }
    });

    return win;
  }

  _showNewGameDialog() {
    if (this.game) {
      ShowDialogWindow({
        title: "New Game",
        text: "Are you sure you want to start a new game?",
        buttons: [
          {
            label: "Yes",
            action: () => {
              const keepScore =
                getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_KEEP_SCORE) === true;
              const scoringOption =
                getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_SCORING) || "standard";
              if (scoringOption === "vegas" && keepScore) {
                this.cumulativeVegasScore = this.game.vegasScore;
              }
              this.startNewGame();
            },
          },
          {
            label: "No",
            action: () => { },
          },
        ],
        parentWindow: this.win,
      });
    } else {
      this.startNewGame();
    }
  }

  async startNewGame() {
    if (this.game) {
      this.game.destroy();
    }

    const keepScore =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_KEEP_SCORE) === true;
    const scoringOption =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_SCORING) || "standard";
    const initialVegasScore =
      scoringOption === "vegas" && keepScore ? this.cumulativeVegasScore : 0;

    this.game = new Game(initialVegasScore);
    this.game.onScoreUpdate = (scores) => this.updateScoreDisplay(scores);

    const timerElement = this.win.element.querySelector("#solitaire-timer");
    if (this.game.isTimedGame) {
      timerElement.style.display = "inline";
      timerElement.textContent = "Time: 0";
      this.game.onTimerUpdate = (time) => {
        timerElement.textContent = `Time: ${time}`;
      };
    } else {
      timerElement.style.display = "none";
    }

    this.updateScoreDisplay({
      standard: this.game.score,
      vegas: this.game.vegasScore,
    });
    this.render();
    this._updateMenuBar(this.win);
    this._updateCardBackAnimation();
  }

  updateScoreDisplay(scores) {
    const scoreElement = this.win.element.querySelector("#solitaire-score");
    if (!scoreElement) return;

    const scoringOption =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_SCORING) || "standard";

    switch (scoringOption) {
      case "standard":
        scoreElement.textContent = `Score: ${scores.standard}`;
        scoreElement.style.display = "inline";
        break;
      case "vegas":
        scoreElement.textContent = `Score: $${scores.vegas}`;
        scoreElement.style.display = "inline";
        break;
      case "none":
        scoreElement.style.display = "none";
        break;
    }
  }

  _updateCardBackAnimation() {
    clearInterval(this.animationTimer);
    const stockCard = this.container.querySelector(".stock-top-card");

    if (stockCard) {
      // Remove all possible animation classes
      for (const key in animatedCardBacks) {
        const info = animatedCardBacks[key];
        for (let i = 1; i <= info.frames; i++) {
          stockCard.classList.remove(`${info.prefix}${i}`);
        }
      }
    }

    const animationInfo = animatedCardBacks[this.game.cardBack];
    if (!animationInfo) return;

    let currentFrame = 1;
    let animationDirection = 1; // 1 for increasing, -1 for decreasing

    const applyFrame = () => {
      const stockCard = this.container.querySelector(".stock-top-card");
      if (stockCard) {
        // Remove all frames for the current animation before adding the new one
        for (let i = 1; i <= animationInfo.frames; i++) {
          stockCard.classList.remove(`${animationInfo.prefix}${i}`);
        }
        stockCard.classList.add(`${animationInfo.prefix}${currentFrame}`);

        currentFrame += animationDirection;

        if (currentFrame > animationInfo.frames) {
          currentFrame = animationInfo.frames - 1; // Go back from the last frame
          animationDirection = -1;
        } else if (currentFrame < 1) {
          currentFrame = 2; // Go forward from the second frame
          animationDirection = 1;
        }
      }
    };

    // Apply the first frame immediately to avoid flickering
    applyFrame();

    this.animationTimer = setInterval(applyFrame, 500);
  }

  _showDeckSelectionDialog() {
    const cardBacks = [
      "cardback1",
      "cardback2",
      "cardback-fish1",
      "cardback-fish2",
      "cardback3",
      "cardback4",
      "cardback-robot1",
      "cardback-rose",
      "cardback-shell",
      "cardback-castle1",
      "cardback-beach1",
      "cardback-hand1",
    ];

    let selectedCardBack = this.game.cardBack;

    const dialogContent = document.createElement("div");
    dialogContent.className = "deck-selection-container";

    cardBacks.forEach((cardBack) => {
      const cardDiv = document.createElement("div");
      cardDiv.className = `card-back-preview card ${cardBack}`;
      if (cardBack === selectedCardBack) {
        cardDiv.classList.add("selected");
      }
      cardDiv.dataset.cardBack = cardBack;
      cardDiv.addEventListener("click", () => {
        selectedCardBack = cardBack;
        dialogContent.querySelectorAll(".card-back-preview").forEach((div) => {
          div.classList.remove("selected");
        });
        cardDiv.classList.add("selected");
      });
      dialogContent.appendChild(cardDiv);
    });

    ShowDialogWindow({
      title: "Select Card Back",
      content: dialogContent,
      buttons: [
        {
          label: "OK",
          action: () => {
            if (this.game.cardBack !== selectedCardBack) {
              this.game.setCardBack(selectedCardBack);
              this.render();
              this._updateCardBackAnimation();
            }
          },
        },
        {
          label: "Cancel",
        },
      ],
      parentWindow: this.win,
      modal: true,
      width: 550,
      height: 300,
    });
  }

  _updateMenuBar(win) {
    const menuBar = new window.MenuBar({
      Game: [
        {
          label: "New Game",
          action: () => this._showNewGameDialog(),
          shortcut: "F2",
        },
        // {
        //   label: "Winning Demo",
        //   action: () => this._startWinningDemo(),
        // },
        {
          label: "Undo",
          enabled: () => !!this.game?.previousState,
          action: () => {
            this.game.undo();
            this.render();
            this._updateMenuBar(this.win);
          },
        },
        "MENU_DIVIDER",
        {
          label: "Deck...",
          action: () => this._showDeckSelectionDialog(),
        },
        {
          label: "Options...",
          action: () => this._showOptionsDialog(),
        },
        "MENU_DIVIDER",
        {
          label: "Exit",
          action: () => this.win.close(),
        },
      ],
    });
    win.setMenuBar(menuBar);
  }

  render() {
    this.renderTableau();
    this.renderStock();
    this.renderWaste();
    this.renderDrawnCards();
    this.renderFoundations();
  }

  renderTableau() {
    const tableauContainer = this.container.querySelector(".tableau-piles");
    tableauContainer.innerHTML = "";
    this.game.tableauPiles.forEach((pile, pileIndex) => {
      const pileDiv = document.createElement("div");
      pileDiv.className = "tableau-pile";
      pileDiv.dataset.pileIndex = pileIndex;
      pileDiv.dataset.pileType = "tableau";

      if (pile.cards.length === 0) {
        const placeholderDiv = document.createElement("div");
        placeholderDiv.className = "tableau-placeholder";
        pileDiv.appendChild(placeholderDiv);
      } else {
        let topOffset = 0;
        const overlap = 15;
        const faceDownOverlap = 5;

        pile.cards.forEach((card, cardIndex) => {
          const cardDiv = card.element;
          cardDiv.style.top = `${topOffset}px`;
          cardDiv.dataset.pileIndex = pileIndex;
          cardDiv.dataset.cardIndex = cardIndex;
          cardDiv.dataset.pileType = "tableau";
          pileDiv.appendChild(cardDiv);

          if (card.faceUp) {
            topOffset += overlap;
          } else {
            topOffset += faceDownOverlap;
          }
        });
      }
      tableauContainer.appendChild(pileDiv);
    });
  }

  renderStock() {
    const stockContainer = this.container.querySelector(".stock-pile");
    stockContainer.innerHTML = "";
    stockContainer.dataset.pileType = "stock";
    if (this.game.stockPile.cards.length > 0) {
      this.game.stockPile.cards.forEach((card, cardIndex) => {
        const cardDiv = card.element;
        // cardDiv.style.position = "absolute";
        cardDiv.style.left = `${Math.floor(cardIndex / 8) * 3}px`;
        cardDiv.style.top = `${Math.floor(cardIndex / 8) * 1}px`;
        cardDiv.dataset.pileType = "stock";
        cardDiv.dataset.pileIndex = 0;
        cardDiv.dataset.cardIndex = cardIndex;

        // Reset class for all cards
        cardDiv.classList.remove("stock-top-card");

        // Add class only to the top card
        if (cardIndex === this.game.stockPile.cards.length - 1) {
          cardDiv.classList.add("stock-top-card");
        }

        stockContainer.appendChild(cardDiv);
      });
    } else {
      const placeholderDiv = document.createElement("div");
      placeholderDiv.className = "stock-placeholder";
      if (this.game.stockRecyclingDepleted) {
        placeholderDiv.classList.add("recycling-depleted");
      }
      stockContainer.appendChild(placeholderDiv);
    }
  }

  renderWaste() {
    const wasteContainer = this.container.querySelector(".waste-pile");
    wasteContainer.innerHTML = "";
    wasteContainer.dataset.pileType = "waste";

    if (this.game.wastePile.cards.length > 0) {
      this.game.wastePile.cards.forEach((card, cardIndex) => {
        const cardDiv = card.element;
        cardDiv.style.left = `${Math.floor(cardIndex / 8) * 3}px`;
        cardDiv.style.top = `${Math.floor(cardIndex / 8) * 1}px`;
        cardDiv.dataset.pileType = "waste"; // Purely visual, not for interaction
        cardDiv.dataset.cardIndex = cardIndex;
        cardDiv.dataset.pileIndex = 0;
        wasteContainer.appendChild(cardDiv);
      });
    }
  }

  renderDrawnCards() {
    const drawnContainer = this.container.querySelector(".drawn-card-pile");
    drawnContainer.innerHTML = "";
    drawnContainer.dataset.pileType = "drawn";

    // Calculate the starting offset from the waste pile for seamless fanning
    const wasteCardCount = this.game.wastePile.cards.length;
    let baseOffsetLeft = 0;
    let baseOffsetTop = 0;
    if (wasteCardCount > 0) {
      const lastWasteCardIndex = wasteCardCount - 1;
      baseOffsetLeft = Math.floor(lastWasteCardIndex / 8) * 3;
      baseOffsetTop = Math.floor(lastWasteCardIndex / 8) * 1;
    }

    if (this.game.drawnCards.length > 0) {
      if (this.game.drawOption === "three") {
        let additionalOffsetLeft = 0;
        let additionalOffsetTop = 0;
        this.game.drawnCards.forEach((card, cardIndex) => {
          const cardDiv = card.element;
          cardDiv.style.left = `${baseOffsetLeft + additionalOffsetLeft}px`;
          cardDiv.style.top = `${baseOffsetTop + additionalOffsetTop}px`;
          cardDiv.dataset.pileType = "drawn";
          cardDiv.dataset.cardIndex = cardIndex;
          cardDiv.dataset.pileIndex = 0;
          drawnContainer.appendChild(cardDiv);
          additionalOffsetLeft += 15;
          additionalOffsetTop += 1;
        });
      } else {
        // "Draw one" logic
        const card = this.game.drawnCards[0];
        const cardDiv = card.element;
        cardDiv.style.left = `${baseOffsetLeft}px`;
        cardDiv.style.top = `${baseOffsetTop}px`;
        cardDiv.dataset.pileType = "drawn";
        cardDiv.dataset.cardIndex = 0;
        cardDiv.dataset.pileIndex = 0;
        drawnContainer.appendChild(cardDiv);
      }
    }
  }

  renderFoundations() {
    const foundationContainer =
      this.container.querySelector(".foundation-piles");
    foundationContainer.innerHTML = "";
    this.game.foundationPiles.forEach((pile, pileIndex) => {
      const pileDiv = document.createElement("div");
      pileDiv.className = "foundation-pile";
      pileDiv.dataset.pileIndex = pileIndex;
      pileDiv.dataset.pileType = "foundation";

      if (pile.cards.length > 0) {
        pile.cards.forEach((card, cardIndex) => {
          const cardDiv = card.element;
          cardDiv.style.left = `${Math.floor(cardIndex / 5) * 3}px`;
          cardDiv.style.top = `${Math.floor(cardIndex / 5) * 1}px`;
          cardDiv.dataset.pileIndex = pileIndex;
          cardDiv.dataset.cardIndex = cardIndex;
          cardDiv.dataset.pileType = "foundation";
          pileDiv.appendChild(cardDiv);
        });
      } else {
        const placeholderDiv = document.createElement("div");
        placeholderDiv.className = "foundation-placeholder";
        placeholderDiv.dataset.pileIndex = pileIndex;
        placeholderDiv.dataset.pileType = "foundation";
        pileDiv.appendChild(placeholderDiv);
      }
      foundationContainer.appendChild(pileDiv);
    });
  }

  addEventListeners() {
    this.container.addEventListener("mousedown", this.boundOnMouseDown);
    this.container.addEventListener("click", this.boundOnClick);
    this.win.element.addEventListener("keydown", (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        this._showNewGameDialog();
      }
    });
  }

  removeEventListeners() {
    this.container.removeEventListener("mousedown", this.boundOnMouseDown);
    this.container.removeEventListener("click", this.boundOnClick);
  }

  onClick(event) {
    if (this.wasDragged) return;

    const stockPileDiv = event.target.closest(".stock-pile");
    if (stockPileDiv) {
      this.game.dealFromStock();
      this.render();
      this._updateMenuBar(this.win);
      return;
    }

    const cardDiv = event.target.closest(".card");
    if (cardDiv) {
      const pileType = cardDiv.dataset.pileType;
      if (pileType === "tableau") {
        const pileIndex = parseInt(cardDiv.dataset.pileIndex, 10);
        const cardIndex = parseInt(cardDiv.dataset.cardIndex, 10);
        this.game.flipTableauCard(pileIndex, cardIndex);
        this.render();
        this._updateMenuBar(this.win);
      }
    }
  }

  onMouseDown(event) {
    if (event.button !== 0) return; // Only main button
    this.wasDragged = false;

    const cardDiv = event.target.closest(".card");
    if (!cardDiv) return;

    const pileType = cardDiv.dataset.pileType;
    const pileIndex = parseInt(cardDiv.dataset.pileIndex, 10);
    const cardIndex = parseInt(cardDiv.dataset.cardIndex, 10);
    const cardUid = cardDiv.dataset.uid;

    const currentTime = new Date().getTime();
    if (
      currentTime - this.lastClickTime < this.doubleClickThreshold &&
      this.lastClickedCardUid === cardUid
    ) {
      // Double click detected
      if (this.game.isValidMoveStack(pileType, pileIndex, cardIndex)) {
        if (
          this.game.autoMoveCardToFoundation(pileType, pileIndex, cardIndex)
        ) {
          if (this.game.checkForWin()) {
            this.showWinDialog();
          }
          this.render();
          this._updateMenuBar(this.win);
        }
      }
      this.lastClickTime = 0;
      this.lastClickedCardUid = null;
      return;
    }

    this.lastClickTime = currentTime;
    this.lastClickedCardUid = cardUid;

    if (!this.game.isValidMoveStack(pileType, pileIndex, cardIndex)) return;

    event.preventDefault();

    this.isDragging = true;
    this.draggedCardsInfo = { pileType, pileIndex, cardIndex };

    let fromPile;
    if (pileType === "tableau") fromPile = this.game.tableauPiles[pileIndex];
    else if (pileType === "waste") fromPile = this.game.wastePile;
    else if (pileType === "drawn") fromPile = { cards: this.game.drawnCards };
    else if (pileType === "foundation")
      fromPile = this.game.foundationPiles[pileIndex];
    else return;

    const cardsToDrag = fromPile.cards.slice(cardIndex);
    const containerRect = this.container.getBoundingClientRect();
    const cardRect = cardDiv.getBoundingClientRect();
    this.dragOffsetX = event.clientX - cardRect.left;
    this.dragOffsetY = event.clientY - cardRect.top;

    if (this.outlineDraggingEnabled) {
      this.draggedElement = document.createElement("div");
      this.draggedElement.className = "dragged-outline";
      this.draggedElement.style.left = `${cardRect.left - containerRect.left}px`;
      this.draggedElement.style.top = `${cardRect.top - containerRect.top}px`;

      let topOffset = 0;
      const overlap = 15;
      cardsToDrag.forEach((card) => {
        const outlineCard = document.createElement("div");
        outlineCard.className = "dragged-outline-card";
        outlineCard.style.top = `${topOffset}px`;
        this.draggedElement.appendChild(outlineCard);
        topOffset += overlap;
      });

      this.container.appendChild(this.draggedElement);
    } else {
      this.draggedElement = document.createElement("div");
      this.draggedElement.className = "dragged-stack";
      this.draggedElement.style.position = "absolute";
      this.draggedElement.style.zIndex = "1000";
      this.draggedElement.style.width = `${cardDiv.offsetWidth}px`;
      this.draggedElement.style.height = `${cardDiv.offsetHeight * (1 + (cardsToDrag.length - 1) * 0.2)}px`;

      let topOffset = 0;
      const overlap = 15;

      cardsToDrag.forEach((card) => {
        const originalElement = this.container.querySelector(
          `.card[data-uid='${card.uid}']`,
        );
        if (originalElement) {
          const clone = originalElement.cloneNode(true);
          clone.style.position = "absolute";
          clone.style.left = "0px";
          clone.style.top = `${topOffset}px`;
          this.draggedElement.appendChild(clone);
          originalElement.classList.add("dragging");

          if (card.faceUp) {
            topOffset += overlap;
          } else {
            topOffset += 5;
          }
        }
      });
      this.container.appendChild(this.draggedElement);
      this.draggedElement.style.left = `${cardRect.left - containerRect.left}px`;
      this.draggedElement.style.top = `${cardRect.top - containerRect.top}px`;
    }

    window.addEventListener("mousemove", this.boundOnMouseMove);
    window.addEventListener("mouseup", this.boundOnMouseUp);
  }

  onMouseMove(event) {
    if (!this.isDragging) return;
    this.wasDragged = true;

    const containerRect = this.container.getBoundingClientRect();
    const x = event.clientX - containerRect.left - this.dragOffsetX;
    const y = event.clientY - containerRect.top - this.dragOffsetY;
    this.draggedElement.style.left = `${x}px`;
    this.draggedElement.style.top = `${y}px`;

    if (this.outlineDraggingEnabled) {
      const draggedRect = this.draggedElement.getBoundingClientRect();
      const potentialTargets = this.container.querySelectorAll(
      ".tableau-pile, .foundation-pile, .foundation-placeholder, .tableau-placeholder",
      );
    let bestTarget = findBestDropTarget(draggedRect, [...potentialTargets]);

    if (bestTarget?.classList.contains('foundation-placeholder') || bestTarget?.classList.contains('tableau-placeholder')) {
      bestTarget = bestTarget.closest('.tableau-pile, .foundation-pile');
    }
    const toPileDiv = bestTarget;

      if (this.hoveredTarget && this.hoveredTarget !== toPileDiv) {
        this.hoveredTarget.classList.remove("invert-colors");
        this.hoveredTarget = null;
      }

      if (toPileDiv) {
        const {
          pileType: fromPileType,
          pileIndex: fromPileIndex,
          cardIndex,
        } = this.draggedCardsInfo;
        const toPileType = toPileDiv.dataset.pileType;
        const toPileIndex = parseInt(toPileDiv.dataset.pileIndex, 10);

        if (
          this.game.isMoveValid(
            fromPileType,
            fromPileIndex,
            cardIndex,
            toPileType,
            toPileIndex,
          )
        ) {
          // Highlight the top card or the placeholder of the target pile
          const topCard = toPileDiv.querySelector(".card:last-child");
          const placeholder = toPileDiv.querySelector(
            ".tableau-placeholder, .foundation-placeholder",
          );
          const highlightTarget = topCard || placeholder;

          if (highlightTarget && this.hoveredTarget !== highlightTarget) {
            if (this.hoveredTarget) {
              this.hoveredTarget.classList.remove("invert-colors");
            }
            highlightTarget.classList.add("invert-colors");
            this.hoveredTarget = highlightTarget;
          }
        } else if (this.hoveredTarget) {
          this.hoveredTarget.classList.remove("invert-colors");
          this.hoveredTarget = null;
        }
      } else if (this.hoveredTarget) {
        this.hoveredTarget.classList.remove("invert-colors");
        this.hoveredTarget = null;
      }
    }
  }

  onMouseUp(event) {
    if (!this.isDragging) return;

    this.isDragging = false;
    window.removeEventListener("mousemove", this.boundOnMouseMove);
    window.removeEventListener("mouseup", this.boundOnMouseUp);

    if (this.hoveredTarget) {
      this.hoveredTarget.classList.remove("invert-colors");
      this.hoveredTarget = null;
    }

    this.container
      .querySelectorAll(".dragging")
      .forEach((el) => el.classList.remove("dragging"));

    const draggedRect = this.draggedElement.getBoundingClientRect();
    this.container.removeChild(this.draggedElement);
    this.draggedElement = null;

    const potentialTargets = this.container.querySelectorAll(
      ".tableau-pile, .foundation-pile, .foundation-placeholder, .tableau-placeholder",
    );
    let bestTarget = findBestDropTarget(draggedRect, [...potentialTargets]);

    if (bestTarget) {
      if (bestTarget.classList.contains('foundation-placeholder') || bestTarget.classList.contains('tableau-placeholder')) {
        bestTarget = bestTarget.closest('.tableau-pile, .foundation-pile');
      }
    }
    const toPileDiv = bestTarget;

    if (toPileDiv) {
      const {
        pileType: fromPileType,
        pileIndex: fromPileIndex,
        cardIndex,
      } = this.draggedCardsInfo;
      const toPileType = toPileDiv.dataset.pileType;
      const toPileIndex = parseInt(toPileDiv.dataset.pileIndex, 10);

      if (
        this.game.moveCards(
          fromPileType,
          fromPileIndex,
          cardIndex,
          toPileType,
          toPileIndex,
        )
      ) {
        if (this.game.checkForWin()) {
          this.showWinDialog();
        }
      }
    }
    this.render();
    this._updateMenuBar(this.win);
    this.draggedCardsInfo = null;
  }

  async showWinDialog() {
    this.game.stopTimer();
    const showFinalDialog = () => {
      if (this.game.isTimedGame && this.game.elapsedTime > 30) {
        const bonus = Math.round(700000 / this.game.elapsedTime);
        this.game.updateScore(bonus);
      }
      this.cumulativeVegasScore = this.game.vegasScore;

      ShowDialogWindow({
        title: "Game Over",
        text: "Congratulations, you won!\nDo you want to start another game?",
        buttons: [
          {
            label: "Yes",
            action: () => this.startNewGame(),
          },
          { label: "No" },
        ],
        parentWindow: this.win,
      });
      this._updateMenuBar(this.win);
    };

    const canvas = this.win.element.querySelector(".win-animation-canvas");
    const gameBoard = this.win.element.querySelector(".game-board");
    const boardRect = gameBoard.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    canvas.width = boardRect.width;
    canvas.height = boardRect.height;
    canvas.style.top = `${boardRect.top - containerRect.top}px`;
    canvas.style.left = `${boardRect.left - containerRect.left}px`;

    const animation = new WinAnimation(
      canvas,
      this.game.foundationPiles,
      showFinalDialog,
    );
    animation.start();
  }

  _showOptionsDialog() {
    const dialogContent = document.createElement("div");
    dialogContent.className = "solitaire-options-container";

    const drawOption = this.game.drawOption || "one";
    const isTimedGame =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_TIMED_GAME) === true;
    const scoringOption =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_SCORING) || "standard";
    const showStatusBar =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_SHOW_STATUS_BAR) !== false;
    const keepScore =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_KEEP_SCORE) === true;

    dialogContent.innerHTML = `
      <div class="options-row">
        <fieldset>
          <legend>Draw</legend>
          <div class="options-column">
            <div class="field-row">
              <input type="radio" id="drawOne" name="draw" value="one" ${drawOption === "one" ? "checked" : ""
      }>
              <label for="drawOne">Draw one</label>
            </div>
            <div class="field-row">
              <input type="radio" id="drawThree" name="draw" value="three" ${drawOption === "three" ? "checked" : ""
      }>
              <label for="drawThree">Draw three</label>
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Scoring</legend>
          <div class="options-column">
            <div class="field-row">
              <input type="radio" id="standard" name="scoring" value="standard" ${scoringOption === "standard" ? "checked" : ""
      }>
              <label for="standard">Standard</label>
            </div>
            <div class="field-row">
              <input type="radio" id="vegas" name="scoring" value="vegas" ${scoringOption === "vegas" ? "checked" : ""
      }>
              <label for="vegas">Vegas</label>
            </div>
            <div class="field-row">
              <input type="radio" id="none" name="scoring" value="none" ${scoringOption === "none" ? "checked" : ""
      }>
              <label for="none">None</label>
            </div>
          </div>
        </fieldset>
      </div>
      <div class="options-row">
          <div class="options-column">
            <div class="field-row">
                <input type="checkbox" id="timedGame" ${isTimedGame ? "checked" : ""
      }>
                <label for="timedGame">Timed game</label>
            </div>
            <div class="field-row">
                <input type="checkbox" id="statusBar" ${showStatusBar ? "checked" : ""
      }>
                <label for="statusBar">Status bar</label>
            </div>
          </div>
          <div class="options-column">
            <div class="field-row">
                <input type="checkbox" id="outlineDragging" ${this.outlineDraggingEnabled ? "checked" : ""
      }>
                <label for="outlineDragging">Outline dragging</label>
            </div>
            <div class="field-row">
                <input type="checkbox" id="keepScore" ${keepScore ? "checked" : ""
      }>
                <label for="keepScore">Keep score</label>
            </div>
          </div>
      </div>
    `;

    const scoringRadios = dialogContent.querySelectorAll(
      'input[name="scoring"]',
    );
    const keepScoreCheckbox = dialogContent.querySelector("#keepScore");

    const updateKeepScoreState = () => {
      const selectedScoring =
        dialogContent.querySelector('input[name="scoring"]:checked')?.value ??
        "standard";
      if (selectedScoring === "vegas") {
        keepScoreCheckbox.disabled = false;
      } else {
        keepScoreCheckbox.disabled = true;
        keepScoreCheckbox.checked = false;
      }
    };

    scoringRadios.forEach((radio) => {
      radio.addEventListener("change", updateKeepScoreState);
    });

    updateKeepScoreState(); // Initial state

    ShowDialogWindow({
      title: "Options",
      content: dialogContent,
      buttons: [
        {
          label: "OK",
          action: () => {
            const selectedDrawOption =
              dialogContent.querySelector('input[name="draw"]:checked')?.value ??
              "one";
            const selectedScoringOption =
              dialogContent.querySelector('input[name="scoring"]:checked')
                ?.value ?? "standard";
            const timedGameCheckbox = dialogContent.querySelector("#timedGame");
            const statusBarCheckbox = dialogContent.querySelector("#statusBar");
            const newTimedGameState = timedGameCheckbox.checked;
            const newShowStatusBarState = statusBarCheckbox.checked;
            const keepScoreCheckbox = dialogContent.querySelector("#keepScore");
            const newKeepScoreState = keepScoreCheckbox.checked;

            const outlineDraggingCheckbox =
              dialogContent.querySelector("#outlineDragging");
            this.outlineDraggingEnabled = outlineDraggingCheckbox.checked;
            setItem(
              LOCAL_STORAGE_KEYS.SOLITAIRE_OUTLINE_DRAGGING,
              this.outlineDraggingEnabled,
            );

            let gameNeedsRestart = false;

            if (this.game.drawOption !== selectedDrawOption) {
              setItem(
                LOCAL_STORAGE_KEYS.SOLITAIRE_DRAW_OPTION,
                selectedDrawOption,
              );
              gameNeedsRestart = true;
            }

            if (scoringOption !== selectedScoringOption) {
              setItem(
                LOCAL_STORAGE_KEYS.SOLITAIRE_SCORING,
                selectedScoringOption,
              );
              gameNeedsRestart = true;
            }

            if (isTimedGame !== newTimedGameState) {
              setItem(
                LOCAL_STORAGE_KEYS.SOLITAIRE_TIMED_GAME,
                newTimedGameState,
              );
              gameNeedsRestart = true;
            }

            if (showStatusBar !== newShowStatusBarState) {
              setItem(
                LOCAL_STORAGE_KEYS.SOLITAIRE_SHOW_STATUS_BAR,
                newShowStatusBarState,
              );
              this._updateStatusBarVisibility();
            }

            if (keepScore !== newKeepScoreState) {
              setItem(
                LOCAL_STORAGE_KEYS.SOLITAIRE_KEEP_SCORE,
                newKeepScoreState,
              );
              gameNeedsRestart = true;
            }

            if (gameNeedsRestart) {
              this.cumulativeVegasScore = 0;
              this.startNewGame();
            }
          },
        },
        {
          label: "Cancel",
        },
      ],
      parentWindow: this.win,
      modal: true,
    });
  }

  _updateStatusBarVisibility() {
    const showStatusBar =
      getItem(LOCAL_STORAGE_KEYS.SOLITAIRE_SHOW_STATUS_BAR) !== false;
    const statusBar = this.win.element.querySelector(".status-bar");
    if (statusBar) {
      statusBar.style.display = showStatusBar ? "flex" : "none";
    }
  }

  _startWinningDemo() {
    this.game.stockPile.cards = [];
    this.game.wastePile.cards = [];
    this.game.drawnCards = [];
    this.game.tableauPiles.forEach((pile) => (pile.cards = []));
    this.game.foundationPiles.forEach((pile) => (pile.cards = []));

    const sortedCards = [...this.game.allCards].sort((a, b) => {
      if (a.suit !== b.suit) {
        return a.suit.localeCompare(b.suit);
      }
      return a.rank.localeCompare(b.rank);
    });

    const suits = ["♥", "♦", "♠", "♣"];
    suits.forEach((suit, i) => {
      const foundationPile = this.game.foundationPiles[i];
      foundationPile.suit = suit;
      foundationPile.cards = sortedCards.filter((card) => card.suit === suit);
      foundationPile.cards.forEach((card) => (card.faceUp = true));
    });

    this.render();
    this.showWinDialog();
  }
}
