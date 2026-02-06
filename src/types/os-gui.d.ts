/**
 * Global os-gui types
 */

declare interface OSGUIWindowOptions {
    title?: string;
    outerWidth?: number;
    outerHeight?: number;
    innerWidth?: number;
    innerHeight?: number;
    resizable?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    closable?: boolean;
    icons?: Record<string | number, string | HTMLElement>;
    icon?: string | HTMLElement | { src?: string; srcset?: string };
    toolWindow?: boolean;
    parentWindow?: OSGUI$Window;
    minimizeButton?: boolean;
    maximizeButton?: boolean;
    closeButton?: boolean;
    $component?: any; // Used for docked components
    iframes?: {
        ignoreCrossOrigin?: boolean;
    };
    constrainRect?: (rect: {x: number, y: number, width: number, height: number}, x_axis: number, y_axis: number) => {x: number, y: number, width: number, height: number};
    minOuterWidth?: number;
    minOuterHeight?: number;
    minInnerWidth?: number;
    minInnerHeight?: number;
}

declare interface OSGUI$Window extends JQuery<HTMLElement> {
    element: HTMLElement;
    $titlebar: JQuery<HTMLElement>;
    $title_area: JQuery<HTMLElement>;
    $title: JQuery<HTMLElement>;
    $content: JQuery<HTMLElement>;
    $x?: JQuery<HTMLElement>;
    $minimize?: JQuery<HTMLElement>;
    $maximize?: JQuery<HTMLElement>;
    $icon?: JQuery<HTMLElement>;

    child_$windows: OSGUI$Window[];
    icons: Record<string | number, any>;
    closed: boolean;

    title(text: string): this;
    title(): string;
    getTitle(): string;

    close(force?: boolean): void;
    minimize(): void;
    unminimize(): void;
    maximize(): void;
    restore(): void;
    bringToFront(): void;
    center(): void;
    applyBounds(): void;
    bringTitleBarInBounds(): void;

    setDimensions(dimensions: { innerWidth?: number, innerHeight?: number, outerWidth?: number, outerHeight?: number }): void;
    setIcons(icons: Record<string | number, any>): void;
    setIconByID(icon_name: string): this;
    setTitlebarIconSize(size: number): void;
    getTitlebarIconSize(): number;
    getIconAtSize(size: number): HTMLElement | null;

    onFocus(callback: () => void): () => void;
    onBlur(callback: () => void): () => void;
    onClosed(callback: () => void): () => void;

    addChildWindow($child_window: OSGUI$Window): void;
    setMenuBar(menu_bar: MenuBar | null): void;
    setMinimizeTarget(element: HTMLElement): void;

    $Button(text: string, handler: () => void): JQuery<HTMLElement>;

    events: {
        on(event: string, callback: (data?: any) => void): void;
        emit(event: string, data?: any): void;
    };
}

declare interface OSGUI$FormWindow extends OSGUI$Window {
    $form: JQuery<HTMLFormElement>;
    $main: JQuery<HTMLElement>;
    $buttons: JQuery<HTMLElement>;
}

declare type MenuAction = () => void;
declare type MenuItem = {
    item?: string;
    label?: string;
    action?: MenuAction;
    checkbox?: {
        type?: "radio" | "checkbox";
        check: () => boolean;
        toggle: () => void;
    };
    shortcut?: string;
    shortcutLabel?: string;
    ariaKeyShortcuts?: string;
    enabled?: boolean | (() => boolean);
    submenu?: MenuItem[];
    description?: string;
    icon?: string;
    default?: boolean;
} | {
    radioItems: {
        item?: string;
        label?: string;
        value: any;
        description?: string;
    }[];
    getValue: () => any;
    setValue: (value: any) => void;
    ariaLabel?: string;
} | "MENU_DIVIDER";

declare interface OSGUITopLevelMenus {
    [key: string]: MenuItem[];
}

declare class MenuBar {
    constructor(menus: OSGUITopLevelMenus);
    element: HTMLElement;
    closeMenus(): void;
    setKeyboardScope(...elements: (HTMLElement | Window)[]): void;
}

declare class MenuPopup {
    constructor(menuItems: MenuItem[], options: any);
    element: HTMLElement;
    highlight(index_or_element: number | HTMLElement): void;
    close(force?: boolean): void;
}

declare var $Window: {
    new (options?: OSGUIWindowOptions): OSGUI$Window;
    Z_INDEX: number;
    DEBUG_FOCUS: boolean;
    OVERRIDE_TRANSITION_DURATION?: number;
};

declare var $FormWindow: {
    new (title?: string): OSGUI$FormWindow;
};

declare var MENU_DIVIDER: "MENU_DIVIDER";

declare interface AccessKeys {
    escape(label: string): string;
    unescape(label: string): string;
    indexOf(label: string): number;
    has(label: string): boolean;
    get(label: string): string | null;
    remove(label: string): string;
    toText(label: string): string;
    toHTML(label: string): string;
    toFragment(label: string): DocumentFragment;
}

declare var AccessKeys: AccessKeys;
