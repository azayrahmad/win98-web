# Solitaire

## Purpose

**Solitaire** (specifically Klondike Solitaire) is perhaps the most iconic Windows game. This implementation for azOS Second Edition is a faithful recreation of the classic Windows 98 version, complete with all the familiar animations and rules.

## Key Features

- **Classic Klondike Rules**: Draw 1 or Draw 3 options.
- **Winning Animations**: Features the legendary "bouncing cards" animation when you win.
- **Scoring**: Supports standard and Vegas scoring modes.
- **Customization**: Change card backs and game options via the menu.
- **Persistence**: Remembers your scores and settings.

## How to Use

1.  Launch **Solitaire** from the desktop or Start Menu.
2.  The goal is to move all cards to the four foundation piles (top right), built up by suit from Ace to King.
3.  Tableau piles (bottom) are built down by alternating colors.
4.  Double-click a card to move it to a foundation pile automatically if valid.
5.  Click the deck (top left) to draw new cards.

## Technologies Used

- **JavaScript/HTML/Canvas**: The game logic and animations are custom-built.
- **ZenFS**: Used to persist game state and user preferences.

## Screenshot

![Screenshot of Solitaire](./screenshot.png)
