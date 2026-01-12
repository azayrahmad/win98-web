// No longer a module, so no imports/exports

const STYLE_KEY = "spidersolitaire.use98style";
const SAVE_KEY = "spidersolitaire-saved-game";
const MENU_DIVIDER = "MENU_DIVIDER";

// Helper functions to replace the app's localStorage utility
function getItem(key) {
  const value = localStorage.getItem(key);
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

class SpiderSolitaireApp {
  constructor() {
    this.title = "Spider Solitaire";
    this.width = 880;
    this.height = 550;
    this.resizable = true;
    this.icon = {
      16: "assets/spider-16.png",
      32: "assets/spider-32.png",
    };
  }

  _createWindow() {
    this.statistics = new Statistics();
    this.use98Style = getItem(STYLE_KEY);
    if (this.use98Style === null) {
      this.use98Style = true;
    }

    const win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
      maximizeButton: false,
      minimizeButton: false,
    });

    this._updateMenuBar(win);

    win.element.querySelector(".window-content").innerHTML = `
            <div class="spider-solitaire-container">
                <div class="game-board">
                    <div class="tableau-piles"></div>
                    <div class="bottom-area">
                        <div class="foundation-piles"></div>
                        <div class="stock-pile"></div>
                    </div>
                </div>
                <div class="status-bar">
                    <div class="status-bar-field" id="score-display">Score: 500</div>
                    <div class="status-bar-field" id="moves-display">Moves: 0</div>
                    <div class="status-bar-field" id="suits-removed-display">Suits removed: </div>
                </div>
            </div>
        `;

    this.win = win;
    this.container = win.element.querySelector(".spider-solitaire-container");
    if (this.use98Style) {
      this.container.classList.add("style-98");
    }
    this.availableMovesIndex = 0;

    this.isDragging = false;
    this.draggedElement = null;
    this.draggedCardsInfo = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);

    this.addEventListeners();

    if (options.autoOpenOnStartup) {
      this._performOpen(true); // Suppress "not found" dialog on startup
    }

    if (!this.game) {
      this.startNewGame(4); // Default to hard if no game was loaded
    }

    win.on("close", () => {
      this._handlePotentialLoss();
      if (options.autoSaveOnExit) {
        this._performSave(true); // Suppress any UI/sound
      }
    });

    return win;
  }

  _showStatisticsDialog() {
    const stats = this.statistics.getStats();
    const content = document.createElement("div");
    content.className = "spider-statistics-content";

    let currentStreakText = "None";
    if (stats.currentStreak.type === "wins") {
      currentStreakText = `${stats.currentStreak.count} Wins`;
    } else if (stats.currentStreak.type === "losses") {
      currentStreakText = `${stats.currentStreak.count} Losses`;
    }

    content.innerHTML = `
      <div class="stat-row">
        <span>High Score:</span>
        <span>${stats.highScore}</span>
      </div>
      <fieldset>
        <legend>Percentage</legend>
        <div class="stat-row">
          <span>Wins:</span>
          <span>${stats.wins}</span>
        </div>
        <div class="stat-row">
          <span>Losses:</span>
          <span>${stats.losses}</span>
        </div>
        <div class="stat-row">
          <span>Win Rate:</span>
          <span>${stats.winRate}%</span>
        </div>
      </fieldset>
      <fieldset>
        <legend>Streaks</legend>
        <div class="stat-row">
          <span>Most Wins:</span>
          <span>${stats.mostWins}</span>
        </div>
        <div class="stat-row">
          <span>Most Losses:</span>
          <span>${stats.mostLosses}</span>
        </div>
        <div class="stat-row">
          <span>Current:</span>
          <span>${currentStreakText}</span>
        </div>
      </fieldset>
    `;

    const dialog = ShowDialogWindow({
      title: "Spider Statistics",
      content: content,
      buttons: [
        {
          label: "OK",
          action: () => dialog.close(),
        },
        {
          label: "Reset",
          action: () => {
            this.statistics.resetStats();
            dialog.close();
            this._showStatisticsDialog();
          },
        },
      ],
      width: 250,
      height: 320,
      parentWindow: this.win,
    });
  }

  _handlePotentialLoss() {
    if (this.game && this.game.moves > 0) {
      this.statistics.recordLoss();
      // We set moves to 0 after recording the loss to prevent it from being counted again
      // if the user performs another action that triggers a loss check for the same abandoned game.
      this.game.moves = 0;
    }
  }

  _showOptionsDialog() {
    const currentOptions = getAllOptions();
    const content = document.createElement("div");
    content.className = "spider-options-content";

    content.innerHTML = `
      <div class="field-row">
        <input type="checkbox" id="animate-dealing" ${currentOptions.animateDealing ? "checked" : ""}>
        <label for="animate-dealing">Animate when dealing cards</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="auto-save" ${currentOptions.autoSaveOnExit ? "checked" : ""}>
        <label for="auto-save">Automatically save game on exit</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="auto-open" ${currentOptions.autoOpenOnStartup ? "checked" : ""}>
        <label for="auto-open">Automatically open previous game at startup</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="prompt-save" ${currentOptions.promptOnSave ? "checked" : ""}>
        <label for="prompt-save">Prompt before saving a game</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="prompt-open" ${currentOptions.promptOnOpen ? "checked" : ""}>
        <label for="prompt-open">Prompt before opening a saved game</label>
      </div>
    `;

    const dialog = ShowDialogWindow({
      title: "Spider Options",
      content: content,
      buttons: [
        {
          label: "OK",
          action: () => {
            const newOptions = {
              animateDealing: content.querySelector("#animate-dealing").checked,
              autoSaveOnExit: content.querySelector("#auto-save").checked,
              autoOpenOnStartup: content.querySelector("#auto-open").checked,
              promptOnSave: content.querySelector("#prompt-save").checked,
              promptOnOpen: content.querySelector("#prompt-open").checked,
            };
            setAllOptions(newOptions);
            dialog.close();
          },
        },
        {
          label: "Cancel",
          action: () => dialog.close(),
        },
      ],
      width: 350,
      height: 250,
      parentWindow: this.win,
    });
  }

  _showNewGameDialog() {
    if (this.game) {
      ShowDialogWindow({
        title: "New Game",
        text: "Are you sure you want to start a new game?",
        buttons: [
          {
            label: "Yes",
            action: () => this._showDifficultyDialog(),
          },
          {
            label: "No",
            action: () => {},
          },
        ],
        parentWindow: this.win,
      });
    } else {
      this._showDifficultyDialog();
    }
  }

  _showDifficultyDialog() {
    let selectedDifficulty = 4;
    const content = document.createElement("div");
    content.innerHTML = `
            <div class="field-row">
                <input type="radio" name="difficulty" value="1" id="easy">
                <label for="easy">1 Suit (Easy)</label>
            </div>
            <div class="field-row">
                <input type="radio" name="difficulty" value="2" id="medium">
                <label for="medium">2 Suits (Medium)</label>
            </div>
            <div class="field-row">
                <input type="radio" name="difficulty" value="4" id="hard" checked>
                <label for="hard">4 Suits (Hard)</label>
            </div>
        `;

    ShowDialogWindow({
      title: "New Game",
      content: content,
      buttons: [
        {
          label: "OK",
          action: () => {
            const selected = content.querySelector(
              'input[name="difficulty"]:checked',
            );
            if (selected) {
              selectedDifficulty = parseInt(selected.value, 10);
            }
            this.startNewGame(selectedDifficulty);
          },
        },
        {
          label: "Cancel",
          action: () => {},
        },
      ],
      parentWindow: this.win,
    });
  }

  startNewGame(difficulty = 1) {
    this._handlePotentialLoss();
    this.game = new Game(difficulty);
    this.render();
    this._updateMenuBar(this.win);
    this._updateStatusBar();
    this.onStockClick();
  }

  restartCurrentGame() {
    this._handlePotentialLoss();
    this.game.restartGame();
    this.render();
    this._updateMenuBar(this.win);
    this._updateStatusBar();
  }

  undoMove() {
    if (this.game.undo()) {
      this.render();
      this._updateMenuBar(this.win);
    }
  }

  _updateMenuBar(win) {
    const canDeal =
      this.game?.stockPile?.canDeal() && !this.game?.checkForWin();
    const canUndo = this.game?.history?.length > 0;

    const menuBar = new window.MenuBar({
      Game: [
        {
          label: "New Game",
          action: () => this._showNewGameDialog(),
          shortcut: "F2",
        },
        {
          label: "Restart this game",
          action: () => this.restartCurrentGame(),
        },
        MENU_DIVIDER,
        {
          label: "Undo",
          action: () => this.undoMove(),
          enabled: () => canUndo,
          shortcut: "Ctrl+Z",
        },
        {
          label: "Deal New Row",
          action: () => this.onStockClick(),
          enabled: () => canDeal,
          shortcut: "D",
        },
        {
          label: "Show An Available Move",
          action: () => this.showNextAvailableMove(),
          shortcut: "M",
        },
        "MENU_DIVIDER",
        {
          label: "Statistics...",
          action: () => this._showStatisticsDialog(),
        },
        {
          label: "Options...",
          action: () => this._showOptionsDialog(),
        },
        {
          label: "98 Style",
          checkbox: {
            check: () => this.use98Style,
            toggle: () => {
              this.use98Style = !this.use98Style;
              setItem(STYLE_KEY, this.use98Style);
              this.container.classList.toggle("style-98", this.use98Style);
              this.render();
            },
          },
        },
        MENU_DIVIDER,
        {
          label: "Save This Game",
          action: () => this._saveGame(),
          shortcut: "Ctrl+S",
        },
        {
          label: "Open Last Saved Game",
          action: () => this._openGame(),
          shortcut: "Ctrl+O",
        },
        MENU_DIVIDER,
        {
          label: "Exit",
          action: () => this.win.close(),
        },
      ],
    });

    const dealButton = document.createElement("div");
    dealButton.className = "menu-button";
    dealButton.innerHTML = "<span>Deal!</span>";
    dealButton.addEventListener("click", () => {
      if (canDeal) {
        this.onStockClick();
      }
    });

    if (canDeal) {
      dealButton.removeAttribute("disabled");
      dealButton.removeAttribute("aria-disabled");
    } else {
      dealButton.setAttribute("disabled", "");
      dealButton.setAttribute("aria-disabled", "true");
    }

    menuBar.element.appendChild(dealButton);

    win.setMenuBar(menuBar);
  }

  render() {
    this.renderTableau();
    this.renderStock();
    this.renderFoundations();
    this._updateStatusBar();
  }

  renderTableau() {
    const tableauContainer = this.container.querySelector(".tableau-piles");
    tableauContainer.innerHTML = "";
    this.game.tableauPiles.forEach((pile, pileIndex) => {
      const pileDiv = document.createElement("div");
      pileDiv.className = "tableau-pile";
      pileDiv.dataset.pileIndex = pileIndex;

      if (pile.cards.length === 0) {
        const placeholderDiv = document.createElement("div");
        placeholderDiv.className = "tableau-placeholder";
        pileDiv.appendChild(placeholderDiv);
      } else {
        pile.cards.forEach((card, cardIndex) => {
          const cardDiv = card.element;
          cardDiv.dataset.pileIndex = pileIndex;
          cardDiv.dataset.cardIndex = cardIndex;
          pileDiv.appendChild(cardDiv);
        });
      }
      tableauContainer.appendChild(pileDiv);
    });
  }

  renderStock() {
    const stockContainer = this.container.querySelector(".stock-pile");
    stockContainer.innerHTML = "";
    if (this.game.stockPile.canDeal()) {
      const dealsLeft = Math.floor(this.game.stockPile.cards.length / 10);
      for (let i = 0; i < dealsLeft; i++) {
        const placeholder = document.createElement("div");
        placeholder.className = "stock-card-placeholder";
        // To make the leftmost card appear on top, set the z-index in reverse order.
        placeholder.style.zIndex = dealsLeft - i;
        stockContainer.appendChild(placeholder);
      }
    }
  }

  renderFoundations() {
    const foundationContainer =
      this.container.querySelector(".foundation-piles");
    foundationContainer.innerHTML = "";
    this.game.foundationPiles.forEach((pile) => {
      const pileDiv = document.createElement("div");
      pileDiv.className = "foundation-pile";
      if (pile.topCard) {
        pileDiv.appendChild(pile.topCard.element);
      }
      foundationContainer.appendChild(pileDiv);
    });
  }

  addEventListeners() {
    this.container.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.container
      .querySelector(".stock-pile")
      .addEventListener("click", this.onStockClick.bind(this));
    this.win.element.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "z") {
        event.preventDefault();
        this.undoMove();
      } else if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        this._saveGame();
      } else if (event.ctrlKey && event.key === "o") {
        event.preventDefault();
        this._openGame();
      } else if (event.key === "d") {
        event.preventDefault();
        this.onStockClick();
      } else if (event.key === "m") {
        event.preventDefault();
        this.showNextAvailableMove();
      } else if (event.key === "F2") {
        event.preventDefault();
        this._showNewGameDialog();
      }
    });
  }

  onMouseDown(event) {
    if (event.button !== 0) return; // Only main button
    const cardDiv = event.target.closest(".card");
    if (!cardDiv) return;

    const pileIndex = parseInt(cardDiv.dataset.pileIndex, 10);
    const cardIndex = parseInt(cardDiv.dataset.cardIndex, 10);

    if (this.game.isValidMoveStack(pileIndex, cardIndex)) {
      event.preventDefault();

      this.isDragging = true;
      this.draggedCardsInfo = { pileIndex, cardIndex };

      const fromPile = this.game.tableauPiles[pileIndex];
      const cardsToDrag = fromPile.cards.slice(cardIndex);

      const containerRect = this.container.getBoundingClientRect();
      const cardRect = cardDiv.getBoundingClientRect();
      this.dragOffsetX = event.clientX - cardRect.left;
      this.dragOffsetY = event.clientY - cardRect.top;

      this.draggedElement = document.createElement("div");
      this.draggedElement.className = "dragged-stack";
      this.draggedElement.style.position = "absolute";
      this.draggedElement.style.zIndex = "1000";

      cardsToDrag.forEach((card) => {
        const originalElement = this.container.querySelector(
          `.card[data-uid='${card.uid}']`,
        );
        if (originalElement) {
          const clone = originalElement.cloneNode(true);
          this.draggedElement.appendChild(clone);
          originalElement.classList.add("dragging");
        }
      });

      this.container.appendChild(this.draggedElement);
      this.draggedElement.style.left = `${cardRect.left - containerRect.left}px`;
      this.draggedElement.style.top = `${cardRect.top - containerRect.top}px`;

      window.addEventListener("mousemove", this.boundOnMouseMove);
      window.addEventListener("mouseup", this.boundOnMouseUp);
    }
  }

  onMouseMove(event) {
    if (!this.isDragging) return;
    const containerRect = this.container.getBoundingClientRect();
    this.draggedElement.style.left = `${event.clientX - containerRect.left - this.dragOffsetX}px`;
    this.draggedElement.style.top = `${event.clientY - containerRect.top - this.dragOffsetY}px`;
  }

  onMouseUp(event) {
    if (!this.isDragging) return;

    // Cleanup dragging state
    this.isDragging = false;
    window.removeEventListener("mousemove", this.boundOnMouseMove);
    window.removeEventListener("mouseup", this.boundOnMouseUp);

    // Un-hide the original cards
    this.container
      .querySelectorAll(".dragging")
      .forEach((el) => el.classList.remove("dragging"));

    // Hide the clone to find the underlying element
    this.draggedElement.style.display = "none";
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY);

    // Remove the clone
    this.container.removeChild(this.draggedElement);
    this.draggedElement = null;

    const toPileDiv = dropTarget?.closest(".tableau-pile");

    if (toPileDiv) {
      const { pileIndex: fromPileIndex, cardIndex } = this.draggedCardsInfo;
      const toPileIndex = parseInt(toPileDiv.dataset.pileIndex, 10);

      if (this.game.moveCards(fromPileIndex, cardIndex, toPileIndex)) {
        this.game.checkForCompletedSets(toPileIndex);
        if (this.game.checkForWin()) {
          this.showWinDialog();
        }
        // Re-render the board to reflect the new state
        this.render();
        this._updateMenuBar(this.win);
        this._updateStatusBar();
      }
    }

    this.draggedCardsInfo = null;
  }

  onStockClick() {
    const result = this.game.dealFromStock();

    if (result.success) {
      this.container.style.pointerEvents = "none";
      try {
        this.renderStock();
        if (options.animateDealing) {
          this.animateDealing(result.cards).then(() => {
            this.game.addDealtCardsToTableau(result.cards);
            this.renderTableau();
            this.game.tableauPiles.forEach((pile, index) => {
              this.game.checkForCompletedSets(index);
            });
            if (this.game.checkForWin()) {
              this.showWinDialog();
            }
            this._updateMenuBar(this.win);
            this._updateStatusBar();
            this.container.style.pointerEvents = "auto";
          });
        } else {
          this.game.addDealtCardsToTableau(result.cards);
          this.renderTableau();
          this.game.tableauPiles.forEach((pile, index) => {
            this.game.checkForCompletedSets(index);
          });
          if (this.game.checkForWin()) {
            this.showWinDialog();
          }
          this._updateMenuBar(this.win);
          this._updateStatusBar();
          this.container.style.pointerEvents = "auto";
        }
      } catch (e) {
        this.container.style.pointerEvents = "auto";
      }
    } else if (result.reason === "EMPTY_PILE") {
      ShowDialogWindow({
        title: "Invalid Move",
        text: "You cannot deal from the stock while a tableau pile is empty.",
        buttons: [{ label: "OK" }],
        parentWindow: this.win,
      });
    }
  }

  animateDealing(cards) {
    if (!options.animateDealing) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let startRect;
      if (this.use98Style) {
        const containerRect = this.container.getBoundingClientRect();
        startRect = {
          left: containerRect.left,
          top: containerRect.bottom,
          width: 0,
          height: 0,
        };
      } else {
        const stockPilePlaceholders = this.container.querySelectorAll(
          ".stock-card-placeholder",
        );
        startRect =
          stockPilePlaceholders[
            stockPilePlaceholders.length
          ]?.getBoundingClientRect() ||
          this.container.querySelector(".stock-pile").getBoundingClientRect();
      }

      const tableauPileRects = Array.from(
        this.container.querySelectorAll(".tableau-pile"),
      ).map((pile) => pile.getBoundingClientRect());
      const containerRect = this.container.getBoundingClientRect();

      const animationLayer = document.createElement("div");
      animationLayer.className = "animation-layer";
      this.container.appendChild(animationLayer);

      let animationsCompleted = 0;

      cards.forEach((card, index) => {
        card.faceUp = true; // Ensure card is face-up before creating the element
        const cardDiv = card.element;

        cardDiv.style.position = "absolute";
        cardDiv.style.left = `${startRect.left - containerRect.left - 70}px`;
        cardDiv.style.top = `${startRect.top - containerRect.top}px`;
        cardDiv.style.transition = "left 0.2s ease-out, top 0.2s ease-out";
        cardDiv.style.zIndex = 100 - index;
        animationLayer.appendChild(cardDiv);

        setTimeout(() => {
          const pile = this.game.tableauPiles[index];
          const targetRect = tableauPileRects[index];

          const pileEl =
            this.container.querySelectorAll(".tableau-pile")[index];

          // Create a temporary clone of the card to measure its final position
          const tempCardDiv = card.element.cloneNode(true);
          tempCardDiv.style.visibility = "hidden"; // Keep it invisible
          pileEl.appendChild(tempCardDiv);

          // Force reflow and get the exact final offsetTop
          const finalTopOffset = tempCardDiv.offsetTop;

          // Clean up by removing the temporary card
          pileEl.removeChild(tempCardDiv);

          cardDiv.style.left = `${targetRect.left - containerRect.left + 5}px`;
          cardDiv.style.top = `${targetRect.top - containerRect.top - 12 + finalTopOffset}px`;

          cardDiv.addEventListener(
            "transitionend",
            () => {
              animationsCompleted++;
              if (animationsCompleted === cards.length) {
                animationLayer.remove();
                resolve();
              }
            },
            { once: true },
          );
        }, index * 100);
      });
    });
    this.render();
    this._updateMenuBar(this.win);
  }

  _updateStatusBar() {
    const scoreDisplay = this.container.querySelector("#score-display");
    const movesDisplay = this.container.querySelector("#moves-display");
    if (scoreDisplay) {
      scoreDisplay.textContent = `Score: ${this.game.score}`;
    }
    if (movesDisplay) {
      movesDisplay.textContent = `Moves: ${this.game.moves}`;
    }
    if (this.game) {
      this.statistics.updateHighScore(this.game.score);
    }
    this._updateSuitsRemovedStatus();
  }

  _updateSuitsRemovedStatus() {
    const suitsRemovedDisplay = this.container.querySelector(
      "#suits-removed-display",
    );
    if (suitsRemovedDisplay && this.game) {
      const suitSymbols = {
        spades: "♠️",
        hearts: "♥️",
        diamonds: "♦️",
        clubs: "♣️",
      };

      const completedSets = this.game.completedSetsBySuit;
      const numberOfSuits = this.game.numberOfSuits;

      let suitsToDisplay;
      if (numberOfSuits === 1) {
        suitsToDisplay = ["spades"];
      } else if (numberOfSuits === 2) {
        suitsToDisplay = ["spades", "hearts"];
      } else {
        suitsToDisplay = ["spades", "hearts", "diamonds", "clubs"];
      }

      let html = "Suits removed: ";
      for (const suit of suitsToDisplay) {
        html += `${suitSymbols[suit]} ${completedSets[suit] ?? 0} `;
      }
      suitsRemovedDisplay.innerHTML = html.trim();
    }
  }

  showWinDialog() {
    this.statistics.recordWin();
    ShowDialogWindow({
      title: "Game Over",
      text: "Congratulations, you won!\nDo you want to start another game?",
      buttons: [
        {
          label: "Yes",
          action: () => this.startNewGame(4),
        },
        { label: "No" },
      ],
      parentWindow: this.win,
    });
    this._updateMenuBar(this.win);
  }

  showNextAvailableMove() {
    const moves = this.game.findAllAvailableMoves();
    if (moves.length === 0) {
      return;
    }

    if (this.availableMovesIndex >= moves.length) {
      this.availableMovesIndex = 0;
    }

    const move = moves[this.availableMovesIndex];
    const { fromPileIndex, cardIndex, toPileIndex } = move;

    const fromPile = this.game.tableauPiles[fromPileIndex];
    const cardsToHighlight = fromPile.cards.slice(cardIndex);

    const sourceElements = cardsToHighlight
      .map((card) => {
        return this.container.querySelector(`.card[data-uid='${card.uid}']`);
      })
      .filter((el) => el);
    sourceElements.forEach((el) => el.classList.add("card-highlight"));

    const toPileDiv = this.container.querySelector(
      `.tableau-pile[data-pile-index='${toPileIndex}']`,
    );
    let targetElement;
    if (this.game.tableauPiles[toPileIndex].cards.length === 0) {
      targetElement = toPileDiv.querySelector(".tableau-placeholder");
    } else {
      const topCard = this.game.tableauPiles[toPileIndex].topCard;
      targetElement = this.container.querySelector(
        `.card[data-uid='${topCard.uid}']`,
      );
    }

    setTimeout(() => {
      sourceElements.forEach((el) => el.classList.remove("card-highlight"));
      if (targetElement) {
        targetElement.classList.add("card-highlight");
      }

      setTimeout(() => {
        if (targetElement) {
          targetElement.classList.remove("card-highlight");
        }
      }, 300);
    }, 300);

    this.availableMovesIndex++;
  }

  _saveGame() {
    const savedGame = getItem(SAVE_KEY);
    if (savedGame && options.promptOnSave) {
      ShowDialogWindow({
        title: "Save Game",
        text: "A saved game already exists. Are you sure you want to replace your previously saved game with your current game?",
        buttons: [
          {
            label: "Yes",
            action: () => this._performSave(),
          },
          { label: "No" },
        ],
        parentWindow: this.win,
      });
    } else {
      this._performSave();
    }
  }

  _performSave(isSilent = false) {
    try {
      const gameState = this.game.toJSON();
      setItem(SAVE_KEY, gameState);
    } catch (error) {
      console.error("Failed to save game:", error);
      if (!isSilent) {
        alert("Unable to save game.");
      }
    }
  }

  _openGame() {
    if (options.promptOnOpen) {
      ShowDialogWindow({
        title: "Open Game",
        text: "Are you sure you want to discard the game you are currently playing, and load your previously saved game?",
        buttons: [
          {
            label: "Yes",
            action: () => this._performOpen(),
          },
          { label: "No" },
        ],
        parentWindow: this.win,
      });
    } else {
      this._performOpen();
    }
  }

  _performOpen(isSilent = false) {
    this._handlePotentialLoss();
    try {
      const savedGame = getItem(SAVE_KEY);
      if (!savedGame) {
        if (!isSilent) {
          ShowDialogWindow({
            title: "Error",
            text: "Unable to load game. No saved game found.",
            buttons: [{ label: "OK" }],
            parentWindow: this.win,
            soundEvent: "Warning",
          });
        }
        return;
      }
      this.game = Game.fromJSON(savedGame);
      this.render();
      this._updateMenuBar(this.win);
    } catch (error) {
      console.error("Failed to load game:", error);
      if (!isSilent) {
        ShowDialogWindow({
          title: "Error",
          text: "Unable to load game.",
          buttons: [{ label: "OK" }],
          parentWindow: this.win,
          soundEvent: "Warning",
        });
      }
    }
  }
}
