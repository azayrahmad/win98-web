// src/config/generate-programfiles.js

/**
 * Dynamically generates the "Program Files" directory structure
 * by scanning the src/apps folder using Vite's import.meta.glob.
 *
 * This function handles JavaScript files and other assets differently to
 * ensure they are processed correctly during the build and rendered
 * properly in the application.
 *
 * @returns {Array} An array of objects representing the folders and files.
 */
export function generateProgramFiles() {
  // Eagerly import non-JS files as URLs. This tells Vite to treat them
  // as assets and provide a URL to their final location in the build output.
  const assetModules = import.meta.glob("/src/apps/**/!(*.js)", {
    eager: true,
    as: "url",
  });

  // Eagerly import JS files as raw text content. This allows us to handle
  // them specially, avoiding them being parsed as modules by Rollup.
  const jsModules = import.meta.glob("/src/apps/**/*.js", {
    eager: true,
    as: "raw",
  });

  const root = {};

  // Helper function to build the nested directory structure from a file path.
  const buildStructure = (path, contentUrl) => {
    const parts = path.replace("/src/apps/", "").split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // This is the file part of the path.
        currentLevel[part] = {
          id: `file-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
          name: part,
          type: "file",
          contentUrl: contentUrl,
        };
      } else {
        // This is a directory part of the path.
        if (!currentLevel[part]) {
          currentLevel[part] = {};
        }
        currentLevel = currentLevel[part];
      }
    });
  };

  // Process all asset files (non-JS).
  for (const path in assetModules) {
    const url = assetModules[path];
    buildStructure(path, url);
  }

  // Process all JavaScript files.
  for (const path in jsModules) {
    const rawContent = jsModules[path];
    // Create a URL-encoded data URI for the JS content. This is Unicode-safe
    // and ensures the browser treats it as plain text.
    const contentUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(
      rawContent,
    )}`;
    buildStructure(path, contentUrl);
  }

  // Helper function to recursively convert the nested 'root' object into the final array structure.
  const buildDirectory = (directory, pathPrefix = "") => {
    return Object.keys(directory)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => {
        const item = directory[name];
        const currentPath = pathPrefix ? `${pathPrefix}/${name}` : name;

      if (item.type === "file") {
        return item;
      } else {
        const children = buildDirectory(item, currentPath);
        if (pathPrefix === "") {
          // This is a top-level app directory, so add the launchable app icon.
          const appId = name;
          children.unshift({
            id: `app-${appId}`,
            type: "app",
            appId: appId,
          });
        }
        return {
          id: `folder-${currentPath.replace(/[^a-zA-Z0-9]/g, "-")}`,
          name: name,
          type: "folder",
          children: children,
        };
      }
    });
  };

  return buildDirectory(root);
}
