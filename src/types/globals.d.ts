import { WindowManager } from '../system/window-manager';

declare global {
  interface Window {
    System: WindowManager & {
      launchApp: (id: string, data?: any) => Promise<void>;
      appManager: any;
      resetInactivityTimer(): void;
    };
    fs: any;
    mounts: any;
    ShowDialogWindow: (options: DialogOptions) => OSGUI$Window;
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
    makeThemeCSSFile: (colors: Record<string, string>) => string;
  }

  interface DialogButton {
    label: string;
    action?: (win: OSGUI$Window) => void | boolean | Promise<void | boolean>;
    isDefault?: boolean;
    disabled?: boolean;
  }

  interface DialogOptions {
    title: string;
    titleIconUrl?: string;
    contentIconUrl?: string;
    text?: string;
    content?: HTMLElement;
    buttons?: DialogButton[];
    soundEvent?: string;
    modal?: boolean;
    showOverlay?: boolean;
    parentWindow?: OSGUI$Window | null;
  }
}
