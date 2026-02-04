# Active Desktop for Windows 98 Web Edition

## Overview
Active Desktop is a feature that allows you to integrate web content directly onto your desktop. Unlike standard wallpapers, Active Desktop supports interactive HTML pages and movable, resizable "Web Items" that sit behind your desktop icons.

## Features
- **HTML Wallpaper**: Set a website or local HTML file as your main desktop background.
- **Web Items**: Add multiple interactive frames (iframes) to your desktop.
- **DeskMover**: Each web item features a classic hover-to-show frame, allowing you to move and resize it.
- **Layering**: Active Desktop content stays behind your icons, preserving the standard desktop experience.
- **Persistence**: All settings, including URLs, positions, and sizes, are saved to ZenFS at `/C:/WINDOWS/activedesktop.json`.
- **Classic Channel Bar**: Includes a faithful recreation of the original Windows 98 Channel Bar using original assets.

## How to Use
### Enabling Active Desktop
There are two ways to enable Active Desktop:
1. **Context Menu**: Right-click on any empty area of the desktop, hover over **Active Desktop**, and check **View as Web Page**.
2. **Display Properties**:
   - Right-click the desktop and select **Properties**.
   - Navigate to the **Web** tab.
   - Check **Show Web content on my Active Desktop**.
   - Click **Apply** or **OK**.

### Customizing Web Items
- **Moving**: Hover over a web item to reveal its title bar. Click and drag the title bar to move the item.
- **Resizing**: Hover over a web item to reveal its frame. Use the handles at the edges and corners to resize it.
- **Adding New Items**: In the **Web** tab of **Display Properties**, click **New...** and enter a URL.
- **Removing Items**:
   - Click the **×** button on the item's title bar (appears on hover).
   - Or, go to the **Web** tab in **Display Properties**, select the item, and click **Delete**.
- **Toggling Visibility**: Uncheck an item in the list within the **Web** tab to hide it without deleting it.

## Technical Details
Active Desktop works by injecting a dedicated layer (`#active-desktop-layer`) behind the icon container.
- **Z-Index**: Active Desktop layer is at `z-index: 0`, while Icons are at `z-index: 1`.
- **Pointer Events**: Clicks on the wallpaper or item frames are intelligently handled to allow standard desktop interactions (like lassoing and context menus) while maintaining full interactivity within the web items themselves.

## Credits
This feature was inspired by and utilizes assets from the [ModernActiveDesktop](https://github.com/Ingan121/ModernActiveDesktop) project by Ingan121. Specifically, the Channel Bar assets and the hover-frame behavior (DeskMover) were adapted from that repository.
