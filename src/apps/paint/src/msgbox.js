// @ts-check
/* global localize */

// Note that this API must be kept in sync with the version in 98.js.org,
// as 98.js.org will write the global `showMessageBox` to provide integration with the web desktop environment,
// i.e. windows that can go outside the iframe.
// We also need to accept the injected global `showMessageBox` function if it exists,
// and set `window.defaultMessageBoxTitle` which is used in 98.js.org to set the default title for message boxes...
// or, couldn't we just provide the default in a wrapper function, similar to how 98.js.org does it?

import { ShowDialogWindow } from "../../../shared/components/dialog-window.js";
// import { localize } from "./app-localization.js";

const exports = {};

/**
 * @typedef {Object} MessageBoxOptions
 * @property {string} [title]
 * @property {string} [message]
 * @property {string} [messageHTML]
 * @property {Array<{ label: string, value: string, default?: boolean, action?: () => void }>} [buttons]
 * @property {"error" | "warning" | "info" | "nuke" | "question"} [iconID]
 * @property {OSGUIWindowOptions} [windowOptions]
 *
 * @typedef {Promise<string> & { $window: JQuery<Window>, $message: JQuery<HTMLDivElement>, promise: MessageBoxPromise }} MessageBoxPromise
 *
 * @param {MessageBoxOptions} options
 * @returns {MessageBoxPromise} Resolves with the value of the button that was clicked. The promise has extra properties for convenience.
 */
function showMessageBox_implementation({
	title = window.defaultMessageBoxTitle ?? "Alert",
	message,
	messageHTML,
	buttons = [{ label: "OK", value: "ok", default: true }],
	iconID = "warning", // "error", "warning", "info", "nuke", or "question"
	windowOptions = {}, // for controlling width, etc.
}) {
	const soundEventMap = {
		error: "SystemHand",
		warning: "SystemExclamation",
		info: "SystemAsterisk",
		nuke: "SystemExclamation",
		question: "SystemQuestion",
	};

	let resolvePromise;
	const promise = /** @type {MessageBoxPromise} */ (new Promise((resolve) => {
		resolvePromise = resolve;
	}));

	const dialogButtons = buttons.map((btn) => ({
		label: btn.label,
		isDefault: btn.default,
		action: () => {
			btn.action?.();
			resolvePromise(btn.value);
		},
	}));

	const escapeHTML = (str) => {
		const p = document.createElement("p");
		p.textContent = str;
		return p.innerHTML;
	};

	const win = ShowDialogWindow({
		title,
		text: messageHTML || (message ? escapeHTML(message).replace(/\n/g, "<br>") : ""),
		buttons: dialogButtons,
		contentIconUrl: `/win98-web/apps/paint/images/${iconID}-32x32-8bpp.png`,
		soundEvent: soundEventMap[iconID] || "SystemExclamation",
		modal: true,
	});

	win.onClosed(() => {
		resolvePromise("closed");
	});

	// Compatibility shims for Paint's expectations
	promise.$window = win;
	// Paint expects $message to be a jQuery object for further manipulation in some cases
	const $message = win.$content.find(".dialog-content-text");
	promise.$message = $message;
	promise.promise = promise;

	return promise;
}

// Prefer a function injected from outside an iframe,
// which will make dialogs that can go outside the iframe,
// for 98.js.org integration.
exports.showMessageBox = window.showMessageBox || showMessageBox_implementation;

// Note `defaultMessageBoxTitle` handling in make_iframe_window (or now function enhance_iframe) in 98.js.org
// https://github.com/1j01/98/blob/361bd759a6d9b71d0fad9e479840598dc0128bb6/src/iframe-windows.js#L111
// Any other default parameters need to be handled there (as it works now)

window.defaultMessageBoxTitle = localize("Paint");

// Don't override alert, because I only use it as a fallback for global error handling.
// If make_window_supporting_scale is not defined, then alert is used instead,
// so it must not also end up calling make_window_supporting_scale.
// More generally, if there's an error in showMessageBox, it must fall back to something that does not use showMessageBox.
// window.alert = (message) => {
// 	showMessageBox({ message });
// };

const { showMessageBox } = exports;
export { showMessageBox };
// Temporary globals until all dependent code is converted to ES Modules
window.showMessageBox = showMessageBox; // used by app-localization.js
