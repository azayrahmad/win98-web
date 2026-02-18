export class MinesweeperGame {
  constructor(width, height, mines) {
    this.width = width;
    this.height = height;
    this.mines = mines;
    this.board = this.createBoard();
    this.isGameOver = false;
    this.placeMines();
    this.calculateNeighbors();
  }

  createBoard() {
    const board = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          x,
          y,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          isQuestion: false,
          neighborMines: 0,
        });
      }
      board.push(row);
    }
    return board;
  }

  placeMines() {
    let minesPlaced = 0;
    while (minesPlaced < this.mines) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (!this.board[y][x].isMine) {
        this.board[y][x].isMine = true;
        minesPlaced++;
      }
    }
  }

  calculateNeighbors() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.board[y][x].isMine) continue;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 &&
              nx < this.width &&
              ny >= 0 &&
              ny < this.height &&
              this.board[ny][nx].isMine
            ) {
              count++;
            }
          }
        }
        this.board[y][x].neighborMines = count;
      }
    }
  }

  revealCell(x, y) {
    const cell = this.board[y][x];
    if (cell.isRevealed || cell.isFlagged || cell.isQuestion) return;
    cell.isRevealed = true;

    if (cell.isMine) {
      // Game over
      return 'mine';
    }

    if (cell.neighborMines === 0) {
      // Reveal neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < this.width &&
            ny >= 0 &&
            ny < this.height
          ) {
            this.revealCell(nx, ny);
          }
        }
      }
    }
    return this.checkWinCondition();
  }

  toggleFlag(x, y) {
    const cell = this.board[y][x];
    if (cell.isRevealed) return;

    if (!cell.isFlagged && !cell.isQuestion) {
      cell.isFlagged = true;
    } else if (cell.isFlagged) {
      cell.isFlagged = false;
      cell.isQuestion = true;
    } else {
      cell.isQuestion = false;
    }
  }

  checkWinCondition() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.board[y][x];
        if (!cell.isMine && !cell.isRevealed) {
          return 'ok';
        }
      }
    }
    return 'win';
  }
}
