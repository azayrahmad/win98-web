export type ClipboardOperation = 'cut' | 'copy' | null;

export interface ClipboardData {
  items: string[];
  operation: ClipboardOperation;
}

const clipboardManager = {
  items: [] as string[],
  operation: null as ClipboardOperation,

  set(items: string[], operation: ClipboardOperation): void {
    this.items = items;
    this.operation = operation;
    document.dispatchEvent(new CustomEvent('clipboard-change', { detail: this }));
  },

  get(): ClipboardData {
    return {
      items: this.items,
      operation: this.operation,
    };
  },

  clear(): void {
    this.items = [];
    this.operation = null;
    document.dispatchEvent(new CustomEvent('clipboard-change', { detail: this }));
  },

  isEmpty(): boolean {
    return this.items.length === 0;
  },
};

export default clipboardManager;
