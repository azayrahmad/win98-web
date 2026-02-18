# Minesweeper

## Purpose

**Minesweeper** is a faithful recreation of the classic Windows 98 logic puzzle game. The goal is to clear a rectangular board containing hidden "mines" without detonating any of them, using clues about the number of neighboring mines in each field.

## Key Features

- **Classic Gameplay**: Experience the authentic mechanics, timing, and difficulty levels of the original game.
- **Difficulty Levels**: Choose between Beginner (9x9, 10 mines), Intermediate (16x16, 40 mines), and Expert (30x16, 99 mines).
- **Custom Games**: Create your own board sizes and mine counts.
- **Best Times**: Tracks and persists your fastest times for each difficulty level.
- **Visual Accuracy**: Uses period-correct sprites for tiles, numbers, and the iconic "smiley face" button.

## How to Use

1.  Launch **Minesweeper** from the desktop or Start Menu.
2.  Left-click a tile to reveal it.
3.  Right-click a tile to mark it with a flag if you suspect it contains a mine.
4.  Double-click (or click both mouse buttons) on a revealed number to "chord" and quickly reveal surrounding tiles if the correct number of flags have been placed.
5.  If you hit a mine, the game is over. Clear all non-mine tiles to win!

## Technologies Used

- **JavaScript/HTML/CSS**: Custom implementation of game logic and rendering.
- **ZenFS**: Used to persist high scores and settings.

## Credits

- The main logic is adapted from [AlexAegis/minesweeper](https://github.com/AlexAegis/minesweeper).
- Number sprites are from [1j01/98](https://github.com/1j01/98).
- Tile sprites and icons are from [The Cutting Room Floor](https://tcrf.net/Minesweeper_(Windows,_1990)).

## Screenshot

![Screenshot of the minesweeper app](./screenshot.png)
