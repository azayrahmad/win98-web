const STATS_KEY = "spidersolitaire-statistics";

class Statistics {
  constructor() {
    this.stats = this._loadStats();
  }

  _loadStats() {
    const stats = getItem(STATS_KEY);
    if (stats) {
      return stats;
    }
    return this._getDefaultStats();
  }

  _saveStats() {
    setItem(STATS_KEY, this.stats);
  }

  _getDefaultStats() {
    return {
      wins: 0,
      losses: 0,
      highScore: 500,
      currentStreak: {
        type: "none",
        count: 0,
      },
      mostWins: 0,
      mostLosses: 0,
    };
  }

  getStats() {
    return {
      ...this.stats,
      winRate:
        this.stats.wins + this.stats.losses > 0
          ? Math.round(
              (this.stats.wins / (this.stats.wins + this.stats.losses)) * 100,
            )
          : 0,
    };
  }

  recordWin() {
    this.stats.wins++;
    if (this.stats.currentStreak.type === "wins") {
      this.stats.currentStreak.count++;
    } else {
      this.stats.currentStreak.type = "wins";
      this.stats.currentStreak.count = 1;
    }

    if (this.stats.currentStreak.count > this.stats.mostWins) {
      this.stats.mostWins = this.stats.currentStreak.count;
    }
    this._saveStats();
  }

  recordLoss() {
    this.stats.losses++;
    if (this.stats.currentStreak.type === "losses") {
      this.stats.currentStreak.count++;
    } else {
      this.stats.currentStreak.type = "losses";
      this.stats.currentStreak.count = 1;
    }

    if (this.stats.currentStreak.count > this.stats.mostLosses) {
      this.stats.mostLosses = this.stats.currentStreak.count;
    }
    this._saveStats();
  }

  updateHighScore(score) {
    if (score > this.stats.highScore) {
      this.stats.highScore = score;
      this._saveStats();
    }
  }

  resetStats() {
    this.stats = this._getDefaultStats();
    this._saveStats();
  }
}
