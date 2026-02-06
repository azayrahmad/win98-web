# MS-DOS Prompt

## Purpose

The **MS-DOS Prompt** provides a command-line interface (CLI) for interacting with the azOS Second Edition virtual file system. It mimics the look and feel of the Windows 98 command prompt, offering a range of standard DOS commands for file and directory management.

## Key Features

- **File System Navigation**: Browse the virtual file system using `DIR`, `CD`, and drive letters (e.g., `A:`, `C:`, `E:`).
- **File Manipulation**: Standard commands like `MD` (mkdir), `RD` (rmdir), `DEL`, `REN`, `TYPE`, and `COPY`.
- **Application Launching**: Launch any registered azOS application directly from the prompt by typing its ID or title.
- **Command History**: Use the Up and Down arrow keys to navigate through previously entered commands.
- **Drive Support**: Full access to the persistent `C:` drive, volatile `A:` (Floppy) and `E:` (CD-ROM) drives.
- **Terminal Emulation**: Powered by `xterm.js` for a robust and authentic terminal experience.

## How to Use

1.  Launch **MS-DOS Prompt** from the Start Menu.
2.  Type `HELP` to see a list of available internal commands.
3.  Use `DIR` to list files in the current directory and `CD <path>` to navigate.
4.  Launch an app by typing its name (e.g., `notepad` or `solitaire`).
5.  Type `CLS` to clear the terminal screen.

## Technologies Used

- **xterm.js**: The core terminal emulator.
- **ZenFS**: The underlying virtual file system.
- **IBM BIOS Font**: Used to provide an authentic period-correct appearance.

## Implementation Details

The application maintains its own state for the current working directory and command history. It resolves paths relative to the current directory and interacts directly with `fs.promises` from `@zenfs/core`. When a command is not recognized as an internal DOS command, it attempts to find a matching application in the system registry or a file association for a local file.
