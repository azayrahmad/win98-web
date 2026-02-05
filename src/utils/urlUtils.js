import { isZenFSPath } from "./zenfs-utils.js";

export function isWebPath(path) {
  if (!path) return false;
  const p = path.toLowerCase();
  if (
    p.startsWith("http://") ||
    p.startsWith("https://") ||
    p.includes("azay.rahmad")
  ) {
    return true;
  }
  // Domain-like: contains a dot, doesn't start with a slash or drive letter, and no spaces
  if (
    !path.startsWith("/") &&
    !/^[A-Z]:/i.test(path) &&
    path.includes(".") &&
    !path.includes(" ")
  ) {
    return true;
  }
  // Local HTML: must start with a slash to be considered a "web path" within the shell
  if (path.startsWith("/") && (p.endsWith(".html") || p.endsWith(".htm"))) {
    return true;
  }
  return false;
}

export function getWebUrl(url, retroMode = true) {
  if (!url) return "";
  let finalUrl = url.trim();

  if (finalUrl.includes("azay.rahmad")) {
    let page = "home.html";
    if (finalUrl.includes("about.html") || finalUrl.endsWith("/about")) {
      page = "about.html";
    } else if (finalUrl.includes("home.html")) {
      page = "home.html";
    } else if (
      finalUrl !== "azay.rahmad" &&
      finalUrl !== "http://azay.rahmad/" &&
      finalUrl !== "http://azay.rahmad"
    ) {
      page = "404.html";
    }
    // Note: In apps, this might need a different base path depending on execution context
    // For now, keeping it as is or returning absolute-ish path
    return `./azay.rahmad/${page}`;
  }

  const isZenFS = isZenFSPath(finalUrl);
  const isLocal =
    isZenFS ||
    finalUrl.startsWith("blob:") ||
    finalUrl.startsWith("file:") ||
    finalUrl.startsWith("data:") ||
    finalUrl.startsWith("activedesktop/") ||
    finalUrl.includes("activedesktop/previews/") ||
    finalUrl.includes("localhost") ||
    finalUrl.includes("127.0.0.1");

  if (
    !isLocal &&
    !finalUrl.startsWith("http://") &&
    !finalUrl.startsWith("https://") &&
    !finalUrl.startsWith("//")
  ) {
    finalUrl = `https://${finalUrl}`;
  }

  if (retroMode && !isLocal) {
    return `https://web.archive.org/web/1998/${finalUrl}`;
  }

  return finalUrl;
}
