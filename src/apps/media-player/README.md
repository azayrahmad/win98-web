# Media Player

## Purpose

The **Media Player** in azOS Second Edition is a versatile tool for playing audio and video files. It supports various modern formats and provides a familiar interface for managing your media.

## Key Features

- **Multi-Format Support**: Plays common audio (MP3, WAV, OGG) and video (MP4, WebM) files.
- **Playback Controls**: Standard Play, Pause, Stop, Seek, and Volume controls.
- **Playlist Management**: Add files to a session playlist for continuous playback.
- **Visualizations**: Includes basic audio visualizations for an enhanced experience.

## How to Use

1.  Launch **Media Player** from the desktop or Start Menu.
2.  Use `File > Open` to select a media file from your virtual drives.
3.  The player will automatically begin playback.
4.  Use the controls at the bottom to manage playback.

## Technologies Used

- **HTML5 Video/Audio API**: For core playback functionality.
- **Canvas API**: Used for real-time audio visualizations.
- **ZenFS**: Used to read media files from the virtual filesystem.

## Screenshot

![Screenshot of the media-player app](./screenshot.png)
