# How to Add a New Screensaver

This guide explains how to add a new screensaver to the application.

## Prerequisites

- You have a screensaver that is a single HTML file or a directory containing an `index.html` file.
- The screensaver should be a static website that can run without a server.

## Steps

1.  **Add Screensaver Files to `public/` Directory**

    - Create a new directory for your screensaver inside the `public/` directory. For example, if your screensaver is named "my-screensaver", create a directory named `my-screensaver` in `public/`.
    - Place all the files for your screensaver in this new directory. Make sure you have an `index.html` file as the entry point for your screensaver.

2.  **Update `screensaver.js`**

    - Open the `src/components/screensaver.js` file.
    - Locate the `SCREENSAVERS` object at the top of the file.
    - Add a new entry to the `SCREENSAVERS` object for your new screensaver. The key should be a unique identifier for your screensaver, and the value should be an object with two properties:
        - `name`: The display name of your screensaver.
        - `path`: The path to the entry point of your screensaver, relative to the `public/` directory.

    For example, if you added a screensaver named "my-screensaver" with an entry point at `my-screensaver/index.html`, you would add the following to the `SCREENSAVERS` object:

    ```javascript
    const SCREENSAVERS = {
      flowerbox: {
        name: 'FlowerBox',
        path: 'screensaver/index.html',
      },
      maze: {
        name: '3D Maze',
        path: 'maze/maze.html',
      },
      'my-screensaver': {
        name: 'My Screensaver',
        path: 'my-screensaver/index.html',
      },
    };
    ```

3.  **Done!**

    - Your new screensaver is now available in the application.

## Compatible Screensavers

- Any static HTML, CSS, and JavaScript project that can run in a browser can be used as a screensaver.
- The screensaver should be self-contained and not require any external dependencies that are not already included in the project.
- The entry point for the screensaver must be an HTML file.
