export {};

declare global {
  interface Window {
    System: {
      incrementZIndex(): number;
      getHighestZIndex(): number;
      minimizeWindow(win: any, skipTaskbarUpdate?: boolean): void;
      restoreWindow(win: any): void;
      updateTitleBarClasses(win: any): void;
      launchApp: (id: string, data?: any) => Promise<void>;
      appManager: any;
      resetInactivityTimer(): void;
    };
    fs: any; // Ideally this would be from @zenfs/core but we'll use any for now to avoid complexity in phase 1
    mounts: any;
    ShowDialogWindow: (options: any) => void;
    playSound: (event: string) => void;
    setTheme: (themeName: string) => Promise<void>;
    RecycleBinManager: any;
    activeProfile: any;
    os_gui_utils: {
        E: (tagName: string, attributes?: Record<string, string>, children?: (Node | string)[]) => HTMLElement;
        uid: () => string;
        get_new_menu_z_index: () => number;
        get_direction: () => "ltr" | "rtl";
    };
  }
}
