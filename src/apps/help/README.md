# Windows Help

## Purpose

**Windows Help** (WinHelp) is the central documentation viewer for azOS Second Edition. It provides a structured way to browse help topics, search for information, and understand how to use the various components of the operating system.

## Key Features

- **Topic Browser**: A hierarchical tree view for navigating through different help categories and topics.
- **HTML Content**: Renders help topics as formatted HTML for readability.
- **Integration**: Designed to be launched by other applications to provide context-sensitive help.

## How to Use

1.  Launch **Help** from the Start Menu.
2.  Use the left-hand sidebar to browse through the "Contents" tab.
3.  Click on a topic to display its content in the main pane.
4.  Use the navigation buttons (if available) to move between topics.

## Technologies Used

- **Tree View**: A custom-built component for hierarchical navigation.
- **HTML/CSS**: For rendering help documents.

## Implementation Details

The Help application reads its content from a set of structured HTML files. The `HelpApp` class manages the layout, including the resizable sidebar and the content iframe.
