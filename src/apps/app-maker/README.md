# App Maker

## Purpose

App Maker is a simple development tool that allows users to create their own custom, windowed applications using HTML. These custom applications can be saved, and they will appear on the desktop with their own icons for easy launching.

## Key Features

- **Custom Application Creation:** Define a unique name, icon, and HTML content for new applications.
- **Configurable Dimensions:** Set the initial width and height for the application's window via the "Options" menu.
- **Icon Support:** Assign an icon to your application by providing a URL to an image or by uploading an image file directly.
- **HTML Content Editor:** A simple code editor is provided to write and edit the HTML for the application's content.
- **File Import:** Load HTML content from a local `.html` file.
- **Live Preview:** Instantly preview how the application will look and function before saving.
- **Persistent Storage:** Saved applications are stored in the browser's `localStorage`, so they persist between sessions.
- **Desktop Integration:** Once saved, a new icon for the custom app is automatically added to the desktop.

## How to Use

1.  Launch **App Maker** from the Start Menu or desktop.
2.  In the "App Name" field, enter a title for your new application.
3.  To set an icon, either paste a direct image URL into the text field or click the "Upload File" button to select an image from your computer.
4.  Write or paste the HTML code for your application's content into the main editor area. You can also load HTML from a file by going to `File > Open HTML...`.
5.  To set the window size for your app, go to `Edit > Options...` and enter the desired width and height in pixels.
6.  To see a preview of your application, select `View > Preview`. A new window will open displaying your rendered HTML.
7.  When you are ready to save, go to `File > Save`.
8.  A confirmation dialog will appear. Click "Yes" to save the app.
9.  A new icon for your application will now be visible on the desktop, and you can launch it by double-clicking it.

## Screenshot

![Screenshot of the appmaker app](./screenshot.png)
