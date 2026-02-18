// No longer a module, so no imports/exports

const HIGH_SCORES_KEY = "minesweeper_high_scores";
const STYLE_KEY = "minesweeper.use98style";

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

class MinesweeperApp {
  // Config properties moved to constructor
  constructor() {
    this.title = "Minesweeper";
    this.width = 200;
    this.height = 280;
    this.resizable = false;
    // Dummy icon property to avoid errors
    this.icon = {
      16: "assets/minesweeper-icon-small.png",
      32: "assets/minesweeper-icon-large.png",
    };
  }

  _createWindow() {
    const win = new $Window({
      title: this.title,
      icons: this.icon,
      width: this.width,
      height: this.height,
      resizable: this.resizable,
    });

    this.difficulty = "beginner";

    const menuBar = new MenuBar({
      Game: [
        { label: "New", action: () => this.resetGame() },
        "MENU_DIVIDER",
        {
          radioItems: [
            { label: "Beginner", value: "beginner" },
            { label: "Intermediate", value: "intermediate" },
            { label: "Expert", value: "expert" },
            { label: "Custom...", value: "custom" },
          ],
          getValue: () => this.difficulty,
          setValue: (value) => {
            switch (value) {
              case "beginner":
                this.setDifficulty(9, 9, 10, "beginner");
                break;
              case "intermediate":
                this.setDifficulty(16, 16, 40, "intermediate");
                break;
              case "expert":
                this.setDifficulty(30, 16, 99, "expert");
                break;
              case "custom":
                this.showCustomDialog();
                break;
            }
          },
        },
        "MENU_DIVIDER",
        {
          label: "Win9x Style",
          checkbox: {
            check: () => this.use98Style,
            toggle: () => {
              this.use98Style = !this.use98Style;
              setItem(STYLE_KEY, this.use98Style);
              this.win.$content
                .find(".minesweeper-app")
                .toggleClass("style-98", this.use98Style);
              this.renderBoard();
            },
          },
        },
        "MENU_DIVIDER",
        { label: "Best Times...", action: () => this.showHighScores() },
        "MENU_DIVIDER",
        { label: "Exit", enabled: false }, // Disabling the Exit button
      ],
      Help: [
        {
          label: "About Minesweeper...",
          action: () => this.showAboutDialog(),
        },
      ],
    });
    this.menuBar = menuBar;
    win.setMenuBar(this.menuBar);

    win.$content.html(`
        <div class="minesweeper-app">
          <div class="game-header">
            <div class="mine-count inset-shallow"></div>
            <div class="smiley"></div>
            <div class="timer inset-shallow"></div>
          </div>
          <div class="game-board"></div>
        </div>
      `);

    this.win = win;
    this.difficulty = "beginner";
    this.isGameStarted = false;

    this.use98Style = getItem(STYLE_KEY);
    if (this.use98Style === null) {
      this.use98Style = true;
    }

    this.highScores = getItem(HIGH_SCORES_KEY);
    if (!this.highScores || typeof this.highScores.beginner === "number") {
      this.highScores = {
        beginner: { time: 999, name: "Anonymous" },
        intermediate: { time: 999, name: "Anonymous" },
        expert: { time: 999, name: "Anonymous" },
      };
    }
    this.explodedMine = null;

    this.setDifficulty(9, 9, 10, "beginner");

    this.boardEl = win.$content.find(".game-board");
    if (this.use98Style) {
      win.$content.find(".minesweeper-app").addClass("style-98");
    }

    const mineCountContainer = win.$content.find(".mine-count")[0];
    this.mineCountDisplay = new SpriteDisplay();
    mineCountContainer.appendChild(this.mineCountDisplay.element);

    const timerContainer = win.$content.find(".timer")[0];
    this.timerDisplay = new SpriteDisplay();
    timerContainer.appendChild(this.timerDisplay.element);

    this.smileyEl = win.$content.find(".smiley");

    this.isMouseDown = false;
    this.pressedCellEl = null;
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);

    this.boardEl.on("mousedown", this.handleMouseDown.bind(this));
    $(document).on("mouseup", this.boundHandleMouseUp); // Listen on document for mouseup
    this.boardEl.on("mouseover", this.handleMouseOver.bind(this));
    this.boardEl.on("mouseout", this.handleMouseOut.bind(this));
    this.boardEl.on("contextmenu", this.handleCellFlag.bind(this));
    this.smileyEl.on("click", this.resetGame.bind(this));
    this.renderBoard();

    win.on("close", () => {
      // Clean up the global mouseup listener when the window is closed
      $(document).off("mouseup", this.boundHandleMouseUp);
    });

    return win;
  }

  setDifficulty(width, height, mines, difficulty) {
    this.difficulty = difficulty;
    this.game = new MinesweeperGame(width, height, mines);
    this.resetGame();
    this.menuBar.element.dispatchEvent(new Event("update"));
  }

  showCustomDialog() {
    const dialogContent = `
      <div class="field-row-stacked">
        <label for="ms-width">Width:</label>
        <input type="number" id="ms-width" value="${this.game.width}" />
      </div>
      <div class="field-row-stacked">
        <label for="ms-height">Height:</label>
        <input type="number" id="ms-height" value="${this.game.height}" />
      </div>
      <div class="field-row-stacked">
        <label for="ms-mines">Mines:</label>
        <input type="number" id="ms-mines" value="${this.game.mines}" />
      </div>
    `;
    const contentElement = document.createElement("div");
    contentElement.innerHTML = dialogContent;

    ShowDialogWindow({
      title: "Custom Field",
      content: contentElement,
      buttons: [
        {
          label: "OK",
          action: (win) => {
            const width = parseInt(document.getElementById("ms-width").value);
            const height = parseInt(document.getElementById("ms-height").value);
            const mines = parseInt(document.getElementById("ms-mines").value);
            this.setDifficulty(width, height, mines, "custom");
          },
          isDefault: true,
        },
        {
          label: "Cancel",
          action: (win) => {
            win.close();
          },
        },
      ],
    });
  }

  showHighScores() {
    const createScoresContent = (scores) => `
      <fieldset>
        <legend>Fastest Mine Sweepers</legend>
        <table style="width: 300px; border-spacing: 5px; background: transparent;">
          <tbody>
            <tr>
              <td>Beginner:</td>
              <td>${scores.beginner.time} seconds</td>
              <td>${scores.beginner.name}</td>
            </tr>
            <tr>
              <td>Intermediate:</td>
              <td>${scores.intermediate.time} seconds</td>
              <td>${scores.intermediate.name}</td>
            </tr>
            <tr>
              <td>Expert:</td>
              <td>${scores.expert.time} seconds</td>
              <td>${scores.expert.name}</td>
            </tr>
          </tbody>
        </table>
      </fieldset>
    `;

    const contentElement = document.createElement("div");
    contentElement.innerHTML = createScoresContent(this.highScores);

    ShowDialogWindow({
      title: "Best Times",
      content: contentElement,
      buttons: [
        {
          label: "Reset Scores",
          action: () => {
            this.highScores = {
              beginner: { time: 999, name: "Anonymous" },
              intermediate: { time: 999, name: "Anonymous" },
              expert: { time: 999, name: "Anonymous" },
            };
            setItem(HIGH_SCORES_KEY, this.highScores);
            contentElement.innerHTML = createScoresContent(this.highScores);
          },
        },
        {
          label: "OK",
          isDefault: true,
          action: (win) => win.close(),
        },
      ],
    });
  }

  showAboutDialog() {
    ShowDialogWindow({
      title: "About Minesweeper",
      text: "Minesweeper clone for azOS.",
    });
  }

  resetGame() {
    this.game = new MinesweeperGame(
      this.game.width,
      this.game.height,
      this.game.mines,
    );
    this.isGameStarted = false;
    this.explodedMine = null;
    if (this.boardEl) {
      // Check if UI is initialized
      this.renderBoard();
      this.stopTimer();
      this.updateMineCount();
      this.timerDisplay.setValue(0);
      this.smileyEl.css(
        "backgroundImage",
        `url('assets/minesweeper-smiley-neutral.png')`
      );
    }
  }

  startTimer() {
    this.timer = 0;
    this.timerDisplay.setValue(0);
    this.stopTimer(); // ensure no multiple timers
    this.timerInterval = setInterval(() => {
      if (this.timer < 999) {
        this.timer++;
        this.timerDisplay.setValue(this.timer);
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
  }

  updateMineCount() {
    const flags = this.game.board
      .flat()
      .filter((cell) => cell.isFlagged).length;
    const remainingMines = this.game.mines - flags;
    this.mineCountDisplay.setValue(remainingMines);
  }

  handleMouseDown(e) {
    if (e.button !== 0 || this.game.isGameOver) return;

    const cellEl = e.target.closest(".cell");
    if (!cellEl) return;

    const { x, y } = cellEl.dataset;
    const cell = this.game.board[y][x];

    if (!cell.isRevealed && !cell.isFlagged) {
      this.isMouseDown = true;
      this.smileyEl.css(
        "backgroundImage",
        `url('assets/minesweeper-smiley-click.png')`
      );
      cellEl.classList.add("pressed");
      this.pressedCellEl = cellEl;
    }
  }

  handleMouseUp(e) {
    if (e.button !== 0 || !this.isMouseDown) return;

    this.isMouseDown = false;
    const cellEl = this.pressedCellEl;

    if (cellEl) {
      cellEl.classList.remove("pressed");
      this._revealCellAndUpdateGameState(cellEl);
      this.pressedCellEl = null;
    }

    if (!this.game.isGameOver) {
      this.smileyEl.css(
        "backgroundImage",
        `url('assets/minesweeper-smiley-neutral.png')`
      );
    }
  }

  handleMouseOver(e) {
    if (!this.isMouseDown) return;

    if (this.pressedCellEl) {
      this.pressedCellEl.classList.remove("pressed");
    }

    const cellEl = e.target.closest(".cell");
    if (cellEl) {
      const { x, y } = cellEl.dataset;
      const cell = this.game.board[y][x];
      if (!cell.isRevealed && !cell.isFlagged) {
        cellEl.classList.add("pressed");
        this.pressedCellEl = cellEl;
      } else {
        this.pressedCellEl = null;
      }
    } else {
      this.pressedCellEl = null;
    }
  }

  handleMouseOut(e) {
    if (!this.isMouseDown) return;

    const cellEl = e.target.closest(".cell");
    if (cellEl && cellEl === this.pressedCellEl) {
      cellEl.classList.remove("pressed");
      this.pressedCellEl = null;
    }
  }

  _revealCellAndUpdateGameState(cellEl) {
    if (!this.isGameStarted) {
      this.startTimer();
      this.isGameStarted = true;
    }

    const { x, y } = cellEl.dataset;
    const result = this.game.revealCell(parseInt(x), parseInt(y));

    if (result === "mine") {
      this.game.isGameOver = true;
      this.explodedMine = { x: parseInt(x), y: parseInt(y) };
      this.stopTimer();
      this.smileyEl.css(
        "backgroundImage",
        `url('assets/minesweeper-smiley-lose.png')`
      );
      this.renderBoard();
    } else if (result === "win") {
      this.game.isGameOver = true;
      this.stopTimer();
      this.smileyEl.css(
        "backgroundImage",
        `url('assets/minesweeper-smiley-win.png')`
      );
      if (
        this.difficulty !== "custom" &&
        this.timer < this.highScores[this.difficulty].time
      ) {
        const content = document.createElement("div");
        content.innerHTML = `
          <p>You have the fastest time for the ${this.difficulty} level: ${this.timer} seconds!</p>
          <p>Please enter your name.</p>
          <input type="text" id="highscore-name" value="Anonymous" style="margin-top: 5px; width: 95%"/>
        `;

        ShowDialogWindow({
          title: "Congratulations",
          content: content,
          modal: true,
          buttons: [
            {
              label: "OK",
              isDefault: true,
              action: (win) => {
                const nameInput = content.querySelector("#highscore-name");
                this.highScores[this.difficulty] = {
                  time: this.timer,
                  name: nameInput.value || "Anonymous",
                };
                setItem(HIGH_SCORES_KEY, this.highScores);
                win.close();
                this.showHighScores();
              },
            },
          ],
          onOpen: () => {
            const nameInput = content.querySelector("#highscore-name");
            nameInput.focus();
            nameInput.select();
          },
        });
      }
      this.renderBoard();
    } else {
      this.renderBoard();
    }
  }

  handleCellFlag(e) {
    e.preventDefault();
    const cellEl = e.target.closest(".cell");
    if (!cellEl) return;
    const { x, y } = cellEl.dataset;
    this.game.toggleFlag(parseInt(x), parseInt(y));
    this.renderBoard();
    this.updateMineCount();
  }

  renderBoard() {
    this.boardEl.html("");
    this.boardEl.css("gridTemplateColumns", `repeat(${this.game.width}, 16px)`);
    for (let y = 0; y < this.game.height; y++) {
      for (let x = 0; x < this.game.width; x++) {
        const cell = this.game.board[y][x];
        const cellEl = document.createElement("div");
        cellEl.classList.add("cell");
        cellEl.dataset.x = x;
        cellEl.dataset.y = y;

        if (this.use98Style) {
          const tile = document.createElement("div");
          tile.classList.add("tile");
          let tileClass = "unopened";

          if (this.game.isGameOver) {
            if (cell.isMine && !cell.isFlagged) {
              tileClass =
                this.explodedMine &&
                this.explodedMine.x === x &&
                this.explodedMine.y === y
                  ? "mine-exploded"
                  : "mine";
            } else if (!cell.isMine && cell.isFlagged) {
              tileClass = "not-mine";
            } else if (cell.isFlagged) {
              tileClass = "flag";
            } else if (cell.isRevealed) {
              tileClass = `cell-${cell.neighborMines}`;
            } else if (cell.isQuestion) {
              tileClass = "question";
            }
          } else {
            if (cell.isRevealed) {
              tileClass = `cell-${cell.neighborMines}`;
            } else if (cell.isFlagged) {
              tileClass = "flag";
            } else if (cell.isQuestion) {
              tileClass = "question";
            }
          }

          tile.classList.add(tileClass);
          cellEl.appendChild(tile);
        } else {
          if (cell.isRevealed) {
            cellEl.classList.add("revealed");
            if (cell.isMine) {
              const img = document.createElement("img");
              img.src = "assets/mine.png";
              cellEl.appendChild(img);
            } else if (cell.neighborMines > 0) {
              const img = document.createElement("img");
              img.src = `assets/${cell.neighborMines}.png`;
              cellEl.appendChild(img);
            }
          } else if (cell.isFlagged) {
            const img = document.createElement("img");
            img.src = "assets/flag.png";
            cellEl.appendChild(img);
          } else if (cell.isQuestion) {
            const img = document.createElement("img");
            img.src = "assets/question-mark.png";
            cellEl.appendChild(img);
          } else if (this.game.isGameOver && cell.isMine) {
            const img = document.createElement("img");
            img.src = "assets/mine.png";
            cellEl.appendChild(img);
            cellEl.classList.add("revealed");
          }
        }
        this.boardEl.append(cellEl);
      }
    }
  }
}
