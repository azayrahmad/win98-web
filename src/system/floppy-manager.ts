let floppyContent: any[] | null = null;
let folderName: string | null = null;

async function buildFileTree(directoryHandle: FileSystemDirectoryHandle): Promise<any[]> {
  const children: any[] = [];
  for await (const entry of (directoryHandle as any).values()) {
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
  async insert({ onBeforeInsert, onAfterInsert }: { onBeforeInsert?: () => void, onAfterInsert?: () => void } = {}): Promise<boolean> {
    onBeforeInsert?.();
    try {
      const directoryHandle = await (window as any).showDirectoryPicker();
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

  eject(): void {
    floppyContent = null;
    folderName = null;
    document.dispatchEvent(new CustomEvent("floppy-ejected"));
  },

  isInserted(): boolean {
    return floppyContent !== null;
  },

  getContents(): any[] | null {
    return floppyContent;
  },

  getFolderName(): string | null {
    return folderName;
  },
};
