# FreeCell

## Purpose

**FreeCell** is a classic solitaire card game that became famous as part of the Windows operating system. This version for azOS Second Edition is a faithful recreation, offering the same challenging gameplay and familiar interface.

## Key Features

- **Standard Rules**: Follows all the classic rules of FreeCell solitaire.
- **Game Management**: Start new games, restart the current game, or select a specific game number.
- **Statistics**: Tracks your wins, losses, and streaks.
- **Options**: Customize gameplay settings like animations and sound.
- **Save/Load**: Automatically saves your progress so you can resume a game later.

## How to Use

1.  Launch **FreeCell** from the Start Menu or desktop.
2.  The goal is to move all cards to the four foundation piles (top right), built up by suit from Ace to King.
3.  Use the four free cells (top left) as temporary storage for cards.
4.  Tableau piles (bottom) can be built down by alternating colors.
5.  Groups of cards can be moved if there are enough free cells or empty tableau columns available.

## Technologies Used

- **JavaScript/HTML/CSS**: Custom game logic and rendering.
- **ZenFS**: Used to persist game statistics and options.

## Screenshot

![Screenshot of FreeCell](./screenshot.png)
