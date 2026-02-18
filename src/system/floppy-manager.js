let floppyContent = null;
let folderName = null;

async function buildFileTree(directoryHandle) {
  const children = [];
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === "file") {
      children.push({
        id: `floppy-${directoryHandle.name}-${entry.name}`,
        name: entry.name,
        type: "file",
        getHandle: () => entry,
      });
    } else if (entry.kind === "directory") {
      children.push({
        id: `floppy-${directoryHandle.name}-${entry.name}`,
        name: entry.name,
        type: "folder",
        children: await buildFileTree(entry),
        getHandle: () => entry,
      });
    }
  }
  return children.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "folder" ? -1 : 1;
  });
}

export const floppyManager = {
  async insert({ onBeforeInsert, onAfterInsert } = {}) {
    onBeforeInsert?.();
    try {
      const directoryHandle = await window.showDirectoryPicker();
      folderName = directoryHandle.name;
      floppyContent = await buildFileTree(directoryHandle);
      document.dispatchEvent(new CustomEvent("floppy-inserted"));
      return true;
    } catch (error) {
      console.error("Error inserting floppy:", error);
      return false;
    } finally {
      onAfterInsert?.();
    }
  },

  eject() {
    floppyContent = null;
    folderName = null;
    document.dispatchEvent(new CustomEvent("floppy-ejected"));
  },

  isInserted() {
    return floppyContent !== null;
  },

  getContents() {
    return floppyContent;
  },

  getFolderName() {
    return folderName;
  },
};
