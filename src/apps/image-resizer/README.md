# Image Resizer

## Purpose

Image Resizer is a utility designed to enlarge digital images while maintaining a sharp, pixelated aesthetic. It uses a nearest-neighbor scaling algorithm, which is ideal for pixel art and other graphics where preserving hard edges is more important than smooth interpolation.

## Key Features

- **File Loading:** Open image files either by using the `File > Open...` menu or by dragging and dropping an image directly onto the application window.
- **Dimension Control:** Specify the exact target width and height in pixels for the resized image.
- **Aspect Ratio Lock:** Optionally maintain the original image's aspect ratio to prevent distortion. When locked, changing the width will automatically update the height, and vice-versa.
- **Side-by-Side Preview:** The interface displays the original image and the enlarged result next to each other for easy comparison.
- **Nearest-Neighbor Scaling:** The resizing algorithm picks the color of the nearest pixel, resulting in a crisp, blocky enlargement without any blurring.
- **Downloadable Result:** The enlarged image can be downloaded as a `.png` file.

## How to Use

1.  Launch the **Image Resizer** application.
2.  Load an image by either:
    -   Going to `File > Open...` and selecting an image from your computer.
    -   Dragging an image file from your computer and dropping it onto the application window.
3.  Once loaded, the original image will appear in the left preview panel.
4.  In the "Resize Options" panel, enter your desired **Width** and **Height**.
5.  Check the "Keep Aspect Ratio" box if you wish to avoid stretching or squashing the image.
6.  Click the **Enlarge** button. The resized image will appear in the right preview panel.
7.  The status bar at the bottom will show the original and new dimensions.
8.  Click the **Download** button to save the enlarged image to your computer.

## Screenshot

![Screenshot of the image-resizer app](./screenshot.png)
