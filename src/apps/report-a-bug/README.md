# Report a Bug

## Purpose

The **Report a Bug** utility allows users to easily provide feedback and report issues encountered while using azOS Second Edition. It streamlines the process of communicating bugs to the development team.

## Key Features

- **Simple Interface**: A clean, focused window for describing the issue.
- **Direct Submission**: Sends reports directly to a backend API for processing.
- **Progress Tracking**: Provides visual feedback while the report is being sent.
- **Confirmation**: Displays a unique report ID upon successful submission.

## How to Use

1.  Launch **Report a Bug** from the Start Menu or a system error dialog.
2.  Type a detailed description of the bug in the text area.
3.  Click **Send**.
4.  Wait for the confirmation dialog showing your report ID.

## Technologies Used

- **Fetch API**: For communicating with the reporting backend.
- **Vercel Proxy**: Uses a specialized proxy to securely forward reports.
- **System Dialogs**: Utilizes `ShowDialogWindow` for alerts and progress indicators.

## Implementation Details

The application sends a POST request to a Vercel-hosted API with the bug description and system metadata. It handles both successful submissions and potential network or server errors, providing appropriate feedback to the user.
