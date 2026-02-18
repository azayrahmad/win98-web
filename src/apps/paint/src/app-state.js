// @ts-check
/* exported $thumbnail_window, airbrush_size, aliasing, brush_shape, brush_size, button, ctrl, current_history_node, enable_fs_access_api, enable_palette_loading_from_indexed_images, eraser_size, file_format, file_name, fill_color, helper_layer, history_node_to_cancel_to, magnification, main_ctx, monochrome, monochrome_palette, my_canvas_height, my_canvas_width, palette, pencil_size, pick_color_slot, pointer, pointer_active, pointer_buttons, pointer_over_canvas, pointer_previous, pointer_start, pointer_type, pointers, polychrome_palette, redos, return_to_magnification, return_to_tools, reverse, root_history_node, saved, selected_colors, selected_tool, selected_tools, selection, shift, show_grid, show_thumbnail, stroke_color, stroke_size, system_file_handle, text_tool_font, textbox, thumbnail_canvas, tool_transparent_mode, transparency, undos, update_helper_layer_on_pointermove_active */

import { default_palette } from "./color-data.js";
import { get_tool_by_id, make_monochrome_palette, make_history_node } from "./functions.js";
import { make_canvas } from "./helpers.js";
import { TOOL_PENCIL } from "./tools.js";

export const default_magnification = 1;

/** @type {Tool} */
export const default_tool = get_tool_by_id(TOOL_PENCIL);

export const default_canvas_width = 683;
export const default_canvas_height = 384;
export let my_canvas_width = default_canvas_width;
export let my_canvas_height = default_canvas_height;

export let aliasing = true;
export let transparency = false;
export let monochrome = false;

export let magnification = default_magnification;
export let return_to_magnification = 4;

/** @type {PixelCanvas} */
export const main_canvas = make_canvas();
main_canvas.classList.add("main-canvas");
/** @type {PixelContext} */
export const main_ctx = main_canvas.ctx;
window.main_ctx = main_ctx;

/** @type {(string | CanvasPattern)[]} */
export let palette = default_palette;
/** @type {(string | CanvasPattern)[]} */
export let polychrome_palette = palette;
/** @type {(string | CanvasPattern)[]} */
export let monochrome_palette = make_monochrome_palette();

// This feature is not ready yet.
// It needs to let the user decide when to switch the palette or not, when saving/opening an image.
// (maybe there could be a palette undo button? feels weird. MS Paint would probably use a dialog.)
// And it needs to handle canvas farbling, where pixel values are slightly different from each other,
// and equivalize them, when saving to a file. And maybe at other times.
// There are a lot of places in this app where I have to handle canvas farbling. It's obnoxious.
export let enable_palette_loading_from_indexed_images = false;

// The File System Access API doesn't provide a way to get the file type selected by the user,
// or to automatically append a file extension to the file name.
// I'm not sure it's worth it to be able to save over an existing file.
// I also like the downloads bar UI to be honest.
// So this might need to be optional, but right now I'm disabling it as it's not ready.
// There are cases where 0-byte files are created, which is either a serious problem,
// it's just from canceling saving when the file name has a problem, and it needs to be cleaned up.
// Also, while I've implemented most of the UI, it'd be nice to release this with recent files support.
export let enable_fs_access_api = false;

/** @type {BrushShape} */
export const default_brush_shape = "circle";
export const default_brush_size = 4;
export const default_eraser_size = 8;
export const default_airbrush_size = 9;
export const default_pencil_size = 1;
export const default_stroke_size = 1; // applies to lines, curves, shape outlines

/** @type {BrushShape} */
export let brush_shape = default_brush_shape;
export let brush_size = default_brush_size;
export let eraser_size = default_eraser_size;
export let airbrush_size = default_airbrush_size;
export let pencil_size = default_pencil_size;
export let stroke_size = default_stroke_size; // applies to lines, curves, shape outlines

/** @type {boolean} */
export let tool_transparent_mode = false;

/** @type {string | CanvasPattern} */
export let stroke_color;
/** @type {string | CanvasPattern} */
export let fill_color;
/** @type {ColorSelectionSlot} */
export let pick_color_slot = "background";

/** @type {Tool} */
export let selected_tool = default_tool;
/** @type {Tool[]} */
export let selected_tools = [selected_tool];
/** @type {Tool[]} */
export let return_to_tools = [selected_tool];

/** @type {{foreground: string | CanvasPattern, background: string | CanvasPattern, ternary: string | CanvasPattern}} */
export let selected_colors = {
	foreground: "",
	background: "",
	ternary: "",
};

/** @type {OnCanvasSelection} */
export let selection; // singleton
/** @type {OnCanvasTextBox} */
export let textbox; // singleton
/** @type {OnCanvasHelperLayer} */
export let helper_layer; // instance used for the grid and tool previews (not a singleton)
/** @type {OSGUI$Window} */
export let $thumbnail_window;
/** @type {PixelCanvas} */
export let thumbnail_canvas;
/** @type {boolean} */
export let show_grid = false;
/** @type {boolean} */
export let show_thumbnail = false;
/** @type {TextToolFontOptions} */
export let text_tool_font = {
	family: '"Arial"', // should be an exact value detected by Font Detective
	size: 12,
	line_scale: 20 / 12,
	bold: false,
	italic: false,
	underline: false,
	vertical: false,
	color: "",
	background: "",
};

/** @type {HistoryNode} */
export let root_history_node = make_history_node({ name: "App Not Loaded Properly - Please send a bug report." }); // will be replaced
/** @type {HistoryNode} */
export let current_history_node = root_history_node;
/** @type {HistoryNode | null} */
export let history_node_to_cancel_to = null;
/** @type {HistoryNode[]} */
export let undos = [];
/** @type {HistoryNode[]} */
export let redos = [];

/** @type {string | undefined} */
export let file_name;
/** @type {string | undefined} */
export let file_format;
/**
 * For saving over opened file on Save. Can be different type for File System Access API vs Electron.
 * @type {UserFileHandle}
 */
export let system_file_handle;
export let saved = true;

/** works in canvas coordinates @type {{x: number, y: number} | undefined} */
export let pointer;
/** works in canvas coordinates @type {{x: number, y: number} | undefined} */
export let pointer_start;
/** works in canvas coordinates @type {{x: number, y: number} | undefined} */
export let pointer_previous;

export let pointer_active = false;
export let pointer_type;
export let pointer_buttons;
export let reverse;
export let ctrl;
export let shift;
export let button;
export let pointer_over_canvas = false;
export let update_helper_layer_on_pointermove_active = false;

/**
 * works in client coordinates, NOT canvas coordinates
 * @type {{ x: number, y: number, pointerId: number, pointerType: string, isPrimary: boolean }[]}
 */
export let pointers = [];

// Attached to window for now because many files still use them as globals
Object.assign(window, {
	default_magnification, default_tool, default_canvas_width, default_canvas_height,
	my_canvas_width, my_canvas_height, aliasing, transparency, monochrome,
	magnification, return_to_magnification, main_canvas, main_ctx,
	palette, polychrome_palette, monochrome_palette,
	enable_palette_loading_from_indexed_images, enable_fs_access_api,
	default_brush_shape, default_brush_size, default_eraser_size,
	default_airbrush_size, default_pencil_size, default_stroke_size,
	brush_shape, brush_size, eraser_size, airbrush_size, pencil_size, stroke_size,
	tool_transparent_mode, stroke_color, fill_color, pick_color_slot,
	selected_tool, selected_tools, return_to_tools, selected_colors,
	selection, textbox, helper_layer, $thumbnail_window, thumbnail_canvas,
	show_grid, show_thumbnail, text_tool_font, root_history_node,
	current_history_node, history_node_to_cancel_to, undos, redos,
	file_name, file_format, system_file_handle, saved,
	pointer, pointer_start, pointer_previous, pointer_active,
	pointer_type, pointer_buttons, reverse, ctrl, shift, button,
	pointer_over_canvas, update_helper_layer_on_pointermove_active, pointers
});
