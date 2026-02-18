const version = import.meta.env.APP_VERSION;
import splashImg from "../../assets/icons/windows_update_large-4.png";
import ballAnimation from "../../assets/img/BALL_ANI.GIF";

export const aboutContent = `
  <div class="about-content" style="display: flex; gap: 16px; padding: 16px; align-items: top;">
    <div style="flex-shrink: 0;">
      <img src="${ballAnimation}" alt="Windows 98 Splash">
    </div>
    <div>
      <h1>Windows 98 Web Edition version ${version}</h1>
      <p>A web-based operating system based on Windows 98, with some quirks.</p>
      <p>Copyright (C) 1997-2025 Microsoft Corp. All rights reserved.</p>
      <div class="version-status" style="margin-top: 16px; font-style: italic;">Checking for updates...</div>
    </div>
  </div>
  <div class="about-buttons">
    <button id="about-readme">README</button>
    <button id="about-changelog">Changelog</button>
  </div>
`;
