# Image Viewer

The Image Viewer is a simple application for azOS that allows you to open, view, and perform basic manipulations on image files. It supports common image formats and provides features like zooming and resizing.

## Features

*   **Open Images**: Load image files from your local system.
*   **Save Images**: Save the currently viewed image, particularly useful after resizing.
*   **Zoom In/Out**: Adjust the zoom level of the image using the menu, keyboard shortcuts (Ctrl++ / Ctrl+-), or the mouse wheel for detailed inspection or to fit the window.
*   **Reset Zoom**: Quickly return the image to its original size (100% zoom).
*   **Resize Image**: Change the dimensions (width and height) of an image with an option to maintain the aspect ratio.
*   **Window Management**: Standard azOS window features like moving, minimizing, and closing.

## How to Use

1.  **Launch the Application**: The Image Viewer can be launched from the azOS desktop or by attempting to open a supported image file.
2.  **Open an Image**:
    *   Click `File` > `Open...` in the menu bar.
    *   Select an image file from your computer.
3.  **Zoom**:
    *   Use the mouse wheel to zoom in (scroll up) or zoom out (scroll down).
    *   Click `View` > `Zoom In` (Scroll Down) to increase the zoom level.
    *   Click `View` > `Zoom Out` (Scroll Down) to decrease the zoom level.
    *   Click `View` > `Reset Zoom` to revert to original size.
4.  **Resize an Image**:
    *   Click `Edit` > `Resize...` in the menu bar.
    *   Enter the desired `Width` and `Height` in the dialog.
    *   Check `Keep Aspect Ratio` to maintain proportionality while resizing.
    *   Click `Resize` to apply the changes.
5.  **Save an Image**:
    *   After opening or resizing an image, click `File` > `Save`.
    *   The image will be downloaded to your system. If the original image was named `example.png`, the resized version will be `resized-example.png`.

## File Support

The Image Viewer supports common image formats that can be rendered by web browsers (e.g., PNG, JPEG, GIF, BMP, WebP).

## Development Notes

The `ImageViewerApp.js` extends the base `Application` class, managing its own window, menu bar, and image display logic. It utilizes HTML5 Canvas for image resizing capabilities.
