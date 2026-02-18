// @ts-check
/* global $Window */

import { $G, E } from "./helpers.js";

/**
 * @param {OSGUIWindowOptions} options
 * @returns {OSGUI$Window}
 */
function make_window_supporting_scale(options) {
	const $w = $Window(options);

	const scale_for_enlarge_ui_mode_and_center = () => {
		if (!$w.is(".edit-colors-window, .storage-manager, .attributes-window, .flip-and-rotate, .stretch-and-skew")) {
			return;
		}
		const c = $w.$content[0];
		const t = $w.$titlebar[0];
		let scale = 1;
		$w.$content.css({
			transform: `scale(${scale})`,
			transformOrigin: "0 0",
			marginRight: "",
			marginBottom: "",
		});
		if (document.body.classList.contains("enlarge-ui")) {
			scale = Math.min(
				(innerWidth) / c.offsetWidth,
				(innerHeight - t.offsetHeight) / c.offsetHeight
			);
			$w.$content.css({
				transform: `scale(${scale})`,
				transformOrigin: "0 0",
				marginRight: c.scrollWidth * (scale - 1),
			});
			// This is separate to prevent content going off the bottom of the window
			// in case the layout changes due to text wrapping.
			$w.$content.css({
				marginBottom: c.scrollHeight * (scale - 1),
			});
			$w.center();
		}
		// for testing (WARNING: can cause rapid flashing, which can cause seizures):
		// requestAnimationFrame(scale_for_enlarge_ui_mode_and_center);
	};

	if (!options.$component) {
		$w.center();

		const scale_for_enlarge_ui_mode_and_center_next_frame = () => {
			requestAnimationFrame(scale_for_enlarge_ui_mode_and_center);
		};
		const on_close = () => {
			$w.off("close", on_close);
			$G.off("enlarge-ui-toggled resize", scale_for_enlarge_ui_mode_and_center_next_frame);
		};
		$w.on("close", on_close);
		$G.on("enlarge-ui-toggled resize", scale_for_enlarge_ui_mode_and_center_next_frame);

		scale_for_enlarge_ui_mode_and_center_next_frame();
	}

	if (options.$component) {
		$w.$content.css({
			contain: "none",
		});
	}

	return $w;
}

/**
 * @param {JQuery<HTMLDivElement> & I$Component} [$component]
 * @returns {OSGUI$Window & I$ToolWindow}
 */
function $ToolWindow($component) {
	return make_window_supporting_scale({
		$component,
		toolWindow: true,
	});
}

export { $ToolWindow, make_window_supporting_scale };

