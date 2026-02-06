# How to Add a New Desktop Theme

This guide will walk you through the process of adding a new desktop theme to Windows 98 Web Edition. No programming experience is required!

## Introduction to Themes

A theme in Windows 98 is a collection of assets that change the look and feel of the desktop. A theme consists of:

*   **A color scheme:** This defines the colors of the windows, buttons, and other UI elements.
*   **A wallpaper:** The background image for the desktop.
*   **Sounds:** A set of sounds for system events, like startup and shutdown.
*   **Icons:** Custom icons for the "My Computer," "Recycle Bin," and "Network Neighborhood" desktop icons.

## Before You Start: Required Assets

Before you begin, you will need to have the following assets ready:

*   **A `.theme` or `.ini` file:** This file contains the color scheme for your theme. You can find these files online or create your own.
*   **A wallpaper image:** This can be a `.jpg`, `.png`, or `.bmp` file.
*   **Sound files:** A set of `.wav` files for the different system events.
*   **Icon files:** `.png` files for the "My Computer," "Recycle Bin," and "Network Neighborhood" icons. You will need two sizes for each icon: 16x16 and 32x32 pixels.

## Step 1: Convert Your Color Scheme to CSS

The first step is to convert your `.theme` or `.ini` file into a CSS file that Windows 98 can use.

1.  Launch Windows 98 Web Edition.
2.  Open the **Start Menu** and go to **Programs > Accessories > Theme to CSS**.
3.  In the "Theme to CSS" application, click the **Open .theme file** button.
4.  Select your `.theme` or `.ini` file.
5.  The application will generate the CSS for your theme. Click the **Copy CSS** button to copy the CSS to your clipboard.
6.  Paste the CSS into a new text file and save it with a `.css` extension (e.g., `my-theme.css`).

## Step 2: Place Your Asset Files

Next, you need to place your asset files in the correct directories:

*   **CSS file:** Place your `.css` file in the `public/os-gui/` directory.
*   **Wallpaper image:** Place your wallpaper image in the `src/assets/img/wallpapers/themes/` directory.
*   **Sound files:** Place your `.wav` files in the `src/assets/audio/` directory.
*   **Icon files:** Place your `.png` icon files in the `src/assets/icons/theme-icons/` directory.

## Step 3: Configure Your Theme

Now it's time to tell Windows 98 about your new theme. You will need to edit four files to do this.

### 1\. `src/config/wallpapers.js`

Open the `src/config/wallpapers.js` file and add a new entry for your wallpaper.

First, you'll need to import your wallpaper at the top of the file:

```javascript
import myThemeWallpaper from "../assets/img/wallpapers/themes/my-theme-wallpaper.jpg";
```

Then, add a new entry to the `themes` array:

```javascript
export const wallpapers = {
  // ...
  themes: [
    // ...
    { id: "myTheme", src: myThemeWallpaper },
  ],
};
```

### 2\. `src/config/sound-schemes.js`

Open the `src/config/sound-schemes.js` file and add a new entry for your sound scheme.

First, import your sound files at the top of the file:

```javascript
import myThemeStartup from "../assets/audio/my-theme-startup.wav";
import myThemeDefaultSound from "../assets/audio/my-theme-default-sound.wav";
// ... import other sound files
```

Then, add a new entry to the `soundSchemes` object:

```javascript
export const soundSchemes = {
  // ...
  "My Theme": {
    Default: myThemeDefaultSound,
    WindowsLogon: myThemeStartup,
    // ... other sound events
  },
};
```

### 3\. `src/config/icon-schemes.js`

Open the `src/config/icon-schemes.js` file and add a new entry for your icon scheme.

First, import your icon files at the top of the file:

```javascript
import myThemeMyComputer16 from "../assets/icons/theme-icons/my-theme-my-computer-16.png";
import myThemeMyComputer32 from "../assets/icons/theme-icons/my-theme-my-computer-32.png";
// ... import other icon files
```

Then, add a new entry to the `iconSchemes` object, using the variables you just imported:

```javascript
export const iconSchemes = {
  // ...
  "my-theme": {
    myComputer: {
      16: myThemeMyComputer16,
      32: myThemeMyComputer32,
    },
    // ... other icons
  },
};
```

### 4\. `src/config/themes.js`

Finally, open the `src/config/themes.js` file and add a new entry for your theme. This will tie all of your assets together.

```javascript
export const themes = {
  // ...
  "my-theme": {
    id: "my-theme",
    name: "My Theme",
    stylesheet: "my-theme.css",
    wallpaper: wallpapers.themes.find((w) => w.id === "myTheme").src,
    soundScheme: "My Theme",
    iconScheme: "my-theme",
  },
};
```

## Step 4 (Optional): Add a Screensaver

You can also add a custom screensaver to your theme. A screensaver can be any webpage.

### 1\. `src/components/screensaver.js`

Open the `src/components/screensaver.js` file and add a new entry for your screensaver. The `path` should be the full URL to your screensaver webpage.

```javascript
export const SCREENSAVERS = {
  // ...
  "my-screensaver": {
    name: "My Awesome Screensaver",
    path: "https://www.example.com/myscreensaver.html",
  },
};
```

### 2\. `src/config/themes.js`

Now, open `src/config/themes.js` again and link your screensaver to your theme by adding the `screensaver` property.

```javascript
export const themes = {
  // ...
  "my-theme": {
    id: "my-theme",
    name: "My Theme",
    stylesheet: "my-theme.css",
    wallpaper: wallpapers.themes.find((w) => w.id === "myTheme").src,
    soundScheme: "My Theme",
    iconScheme: "my-theme",
    screensaver: "my-screensaver", // Add this line
  },
};
```

## Step 5 (Optional): Add a Custom Font

You can also add a custom font to your theme.

To do this, you will need to add an `@font-face` rule to your theme's `.css` file (e.g., `my-theme.css`). You can then override the default fonts by setting the `--font-family-title`, `--font-size-title`, and `--font-family-menu` CSS variables.

Here's an example of how to add a custom font to your theme's CSS file:

```css
/* Add the @font-face rule at the top of your theme's CSS file */
@font-face {
  font-family: "My Custom Font";
  src: url("https://example.com/my-custom-font.woff2") format("woff2");
}

/* Override the default fonts by setting the CSS variables */
:root {
  --font-family-title: "My Custom Font", sans-serif;
  --font-size-title: 18px;
  --font-family-menu: "My Custom Font", sans-serif;
}
```

## Step 6: Verify Your Theme

You're all done! To see your new theme in action:

1.  Launch Windows 98 Web Edition.
2.  Right-click on the desktop and select **Properties**.
3.  Go to the **Themes** tab.
4.  You should see your new theme in the list of available themes. Select it to apply it.

Congratulations, you've successfully added a new theme to Windows 98 Web Edition!
