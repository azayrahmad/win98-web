# Paint

## Purpose

The Paint application provides a classic drawing and image editing experience within the azOS environment. It is a web-based replica of the beloved Microsoft Paint program, offering a wide range of familiar tools for creating and editing images.

## Key Features

- **Embedded Application:** The application is an embedded version of `jspaint.app`, a feature-rich, open-source web application that faithfully recreates the classic MS Paint.
- **Full Toolset:** Includes all the standard tools you would expect from a classic paint program:
    -   **Drawing Tools:** Pencil, Brush, Airbrush, Line, Curve.
    -   **Shape Tools:** Rectangle, Polygon, Ellipse, Rounded Rectangle.
    -   **Selection Tools:** Free-Form Select, Select.
    -   **Other Tools:** Eraser, Fill with Color, Pick Color, Magnifier, Text.
- **Color Palette:** A classic color palette allows you to select foreground and background colors.
- **Image Editing:** Perform basic image manipulations like flip, rotate, stretch, and skew.
- **File Support:** Supports opening and saving various image formats.

*Note: Since this is an embedded third-party web application, file operations (opening and saving) will interact with your computer's local file system directly through the browser's dialogs, not the virtual azOS file system.*

## How to Use

1.  Launch the **Paint** application.
2.  Select a tool from the toolbox on the left.
3.  Choose a color from the color palette at the bottom.
4.  Click and drag on the canvas to draw.
5.  Use the menu bar at the top (`File`, `Edit`, `View`, `Image`, `Colors`, `Help`) to access more advanced features like opening files, saving your work, and applying image effects.

## Screenshot

![Screenshot of the paint app](./screenshot.png)
