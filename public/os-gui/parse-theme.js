/**
 * @param {string} data
 * @returns {Record<string, string | Record<string, string>>}
 * @private
 */
function parseINIString(data) {
  var regex = {
    section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
    param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
    comment: /^\s*;.*$/,
  };
  /** @type {Record<string, string | Record<string, string>>} */
  var value = {};
  var lines = data.split(/[\r\n]+/);
  /** @type {string | null} */
  var section = null;
  lines.forEach(function (line) {
    try {
      if (regex.comment.test(line)) {
        return;
      } else if (regex.param.test(line)) {
        var match = line.match(regex.param);
        if (match) {
          if (section) {
            // @ts-ignore
            value[section][match[1]] = match[2];
          } else {
            // @ts-ignore
            value[match[1]] = match[2];
          }
        }
      } else if (regex.section.test(line)) {
        var match = line.match(regex.section);
        if (match) {
          // @ts-ignore
          value[match[1]] = {};
          // @ts-ignore
          section = match[1];
        }
      } else if (line.trim().length == 0 && section) {
        // REALLY?? An empty line resets the section?? Dubious!
        // What does Windows do?
        // section = null; // Disabled for now as it seems to break things if sections have empty lines
      }
    } catch (e) {
      console.error("Error parsing INI line:", line, e);
    }
  });
  return value;
}

/**
 * @param {Record<string, string> | CSSStyleDeclaration} cssProperties
 * @returns {Record<string, string>}
 */
function renderThemeGraphics(cssProperties) {
  /**
   * @param {string} propName
   * @returns {string}
   */
  var getProp = (propName) =>
    typeof cssProperties.getPropertyValue === "function"
      ? cssProperties.getPropertyValue(propName)
      : /** @type {Record<string, string>} */ (cssProperties)[propName];

  var canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2;
  var ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error(
      "Failed to get 2d context for canvas to render theme graphics",
    );
    return {};
  }
  ctx.fillStyle = getProp("--ButtonFace");
  ctx.fillRect(0, 1, 1, 1);
  ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = getProp("--ButtonHilight");
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillRect(1, 1, 1, 1);
  var checker = `url("${canvas.toDataURL()}")`;

  var scrollbar_size = parseInt(getProp("--scrollbar-size"));
  if (!isFinite(scrollbar_size)) {
    scrollbar_size = 13;
  }
  var scrollbar_button_inner_size = scrollbar_size - 4;

  // I don't know the exact formula, so approximate and special-case it for now
  // (It may very well *be* special cased, tho)
  var arrow_size = Math.floor(0.3 * scrollbar_size);
  if (scrollbar_size < 16 && scrollbar_size > 13) arrow_size -= 1;

  var arrow_width = arrow_size * 2 - 1;

  var arrow_canvas = document.createElement("canvas");
  var arrow_ctx = arrow_canvas.getContext("2d");
  if (!arrow_ctx) {
    console.error(
      "Failed to get 2d context for canvas to render arrow graphics for theme",
    );
    return {};
  }
  arrow_canvas.width = arrow_width;
  arrow_canvas.height = arrow_size;
  arrow_ctx.fillStyle = "white";
  for (let y = 0; y < arrow_size; y += 1) {
    for (let x = y; x < arrow_width - y; x += 1) {
      arrow_ctx.fillRect(x, y, 1, 1);
    }
  }

  canvas.width = scrollbar_button_inner_size * 4;
  canvas.height = scrollbar_button_inner_size;
  let i = 0;
  for (let horizontal = 0; horizontal < 2; horizontal += 1) {
    for (let decrement = 0; decrement < 2; decrement += 1) {
      ctx.save();
      ctx.translate(i * scrollbar_button_inner_size, 0);
      ctx.translate(
        scrollbar_button_inner_size / 2,
        scrollbar_button_inner_size / 2,
      );
      // ctx.rotate(i * Math.PI / 2);
      if (horizontal) {
        ctx.rotate(-Math.PI / 2);
      }
      if (decrement) {
        ctx.scale(1, -1);
      }
      ctx.translate(
        -scrollbar_button_inner_size / 2,
        -scrollbar_button_inner_size / 2,
      );
      ctx.drawImage(
        arrow_canvas,
        ~~(scrollbar_button_inner_size / 2 - arrow_width / 2),
        ~~(scrollbar_button_inner_size / 2 - arrow_size / 2),
      );
      ctx.restore();
      i += 1;
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = getProp("--ButtonText");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var scrollbar_arrows_ButtonText = `url("${canvas.toDataURL()}")`;
  ctx.fillStyle = getProp("--GrayText");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var scrollbar_arrows_GrayText = `url("${canvas.toDataURL()}")`;
  ctx.fillStyle = getProp("--ButtonHilight");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var scrollbar_arrows_ButtonHilight = `url("${canvas.toDataURL()}")`;
  // ctx.fillStyle = "red";
  // ctx.fillRect(0, 0, canvas.width, canvas.height);
  // canvas.style.background = "rgba(0, 0, 0, 0.2)";
  // $("h1").append(arrow_canvas).append(canvas);
  ctx.restore();

  function generate_svg_data_uri(svg_contents) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      svg_contents,
    )}`;
  }
  function generate_url_svg_data_uri(svg_contents) {
    return `url("${generate_svg_data_uri(svg_contents)}")`;
  }

  function generate_fieldset_border_svg() {
    return `
			<path fill-rule="evenodd" clip-rule="evenodd" d="M0 0h5v5H0V2h2v1h1V2H0" fill="${getProp(
        "--ButtonHilight",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M0 0h4v4H0V1h1v2h2V1H0" />
		`;
  }

  function generate_radio_button_svg(active, disabled) {
    let face_color = getProp("--ButtonHilight");
    if (active) {
      face_color = getProp("--ButtonFace");
    }
    if (disabled) {
      face_color = getProp("--ButtonFace");
    }
    return `
			<path fill-rule="evenodd" clip-rule="evenodd" d="M8 0H4v1H2v1H1v2H0v4h1v2h1V8H1V4h1V2h2V1h4v1h2V1H8V0z" fill="${getProp(
        "--ButtonShadow",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M8 1H4v1H2v2H1v4h1v1h1V8H2V4h1V3h1V2h4v1h2V2H8V1z" fill="${getProp(
        "--ButtonDkShadow",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M9 3h1v1H9V3zm1 5V4h1v4h-1zm-2 2V9h1V8h1v2H8zm-4 0v1h4v-1H4zm0 0V9H2v1h2z" fill="${getProp(
        "--ButtonLight",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M11 2h-1v2h1v4h-1v2H8v1H4v-1H2v1h2v1h4v-1h2v-1h1V8h1V4h-1V2z" fill="${getProp(
        "--ButtonHilight",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M4 2h4v1h1v1h1v4H9v1H8v1H4V9H3V8H2V4h1V3h1V2z" fill="${face_color}" />
		`;
  }

  function generate_radio_dot_svg(disabled) {
    const color = disabled
      ? getProp("--ButtonShadow")
      : getProp("--ButtonText");
    return `
			<path fill-rule="evenodd" clip-rule="evenodd" d="M3 0H1v1H0v2h1v1h2V3h1V1H3V0z" fill="${color}" />
		`;
  }

  function generate_checkbox_svg(disabled) {
    const color = disabled
      ? getProp("--ButtonShadow")
      : getProp("--ButtonText");
    return `
			<path fill-rule="evenodd" clip-rule="evenodd" d="M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z" fill="${color}" />
		`;
  }

  function generate_select_arrow_svg() {
    return `
			<path fill-rule="evenodd" clip-rule="evenodd" d="M15 0H0v16h1V1h14V0z" fill="${getProp(
        "--ButtonLight",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M2 1H1v14h1V2h12V1H2z" fill="${getProp(
        "--ButtonHilight",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M16 17H0v-1h15V0h1v17z" fill="${getProp(
        "--ButtonDkShadow",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M15 1h-1v14H1v1h14V1z" fill="${getProp(
        "--ButtonShadow",
      )}" />
			<path fill="${getProp("--ButtonFace")}" d="M2 2h12v13H2z" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M11 6H4v1h1v1h1v1h1v1h1V9h1V8h1V7h1V6z" fill="${getProp(
        "--ButtonText",
      )}" />
		`;
  }

  function generate_range_thumb_svg() {
    return `
			<path fill-rule="evenodd" clip-rule="evenodd" d="M0 0v16h2v2h2v2h1v-1H3v-2H1V1h9V0z" fill="${getProp(
        "--ButtonHilight",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M1 1v15h1v1h1v1h1v1h2v-1h1v-1h1v-1h1V1z" fill="${getProp(
        "--ButtonFace",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M9 1h1v15H8v2H6v2H5v-1h2v-2h2z" fill="${getProp(
        "--ButtonShadow",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M10 0h1v16H9v2H7v2H5v1h1v-2h2v-2h2z" fill="${getProp(
        "--ButtonDkShadow",
      )}" />
		`;
  }

  function generate_range_box_thumb_svg() {
    return `
			<path fill-rule="evenodd" clip-rule="evenodd" d="M0 0v20h1V1h9V0z" fill="${getProp(
        "--ButtonHilight",
      )}" />
			<path fill="${getProp("--ButtonFace")}" d="M1 1h8v18H1z" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M9 1h1v19H1v-1h8z" fill="${getProp(
        "--ButtonShadow",
      )}" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M10 0h1v21H0v-1h10z" fill="${getProp(
        "--ButtonDkShadow",
      )}" />
		`;
  }

  function generate_select_arrow_active_svg() {
    return `
			<path fill-rule="evenodd" clip-rule="evenodd" d="M0 0h16v17H0V0zm1 16h14V1H1v15z" fill="${getProp(
        "--ButtonShadow",
      )}" />
			<path fill="${getProp("--ButtonFace")}" d="M1 1h14v15H1z" />
			<path fill-rule="evenodd" clip-rule="evenodd" d="M12 7H5v1h1v1h1v1h1v1h1v-1h1V9h1V8h1V7z" fill="${getProp(
        "--ButtonText",
      )}" />
		`;
  }

  /**
   * @param {number} border_size
   * @param {string} svg_contents
   * @returns {string}
   */
  function border_image(border_size, svg_contents) {
    var base_size = 8;
    var border_size = border_size;
    var scale = 32;
    var slice_size = border_size * scale;
    var view_size = base_size * scale;
    // transform causes janky buggy garbage
    // var svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${view_size}px" height="${view_size}px" viewBox="0 0 ${view_size} ${view_size}">
    // 	<g transform="scale(${scale})">
    // 		${svg_contents}
    // 	</g>
    // </svg>`;
    var svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${view_size}px" height="${view_size}px" viewBox="0 0 ${view_size} ${view_size}">
			${svg_contents.replace(
        /(d|x|y|width|height|stroke-width)="[^"]*"/g,
        (attr) =>
          attr.replace(/\d+/g, (n) => `${Number(n) * scale}`),
      )}
		</svg>`;
    var url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    return `url("${url}") ${slice_size} / ${border_size}px`;
  }

  var button_active_border_image = border_image(
    2,
    `
		<path d="M0 0h8v8h-8v-8z" fill="${getProp("--ButtonDkShadow")}"/>
		<path d="M1 1h6v6h-6v-6z" fill="${getProp("--ButtonShadow")}"/>
		<path d="M2 2h4v4h-4v-4z" fill="${getProp("--ButtonFace")}"/>
	`,
  );
  var button_default_active_border_image = border_image(
    2,
    `
		<path d="M0 0h8v8h-8v-8z" fill="${getProp("--ButtonDkShadow")}"/>
		<path d="M1 1h6v6h-6v-6z" fill="${getProp("--ButtonShadow")}"/>
		<path d="M2 2h4v4h-4v-4z" fill="${getProp("--ButtonFace")}"/>
		<rect x="0" y="0" width="8" height="8" stroke-width="2" stroke="${getProp(
      "--WindowFrame",
    )}" fill="none"/>
	`,
  );
  // TODO: rename
  var button_normal_border_image = border_image(
    2,
    `
		<path d="M0 0h7v1h-6v6h-1v-7z" fill="${getProp("--ButtonHilight")}"/>
		<path d="M7 0h1v8h-8v-1h7v-7z" fill="${getProp("--ButtonDkShadow")}"/>
		<path d="M1 1h5v1h-4v4h-1v-5z" fill="${getProp("--ButtonLight")}"/>
		<path d="M6 1h1v6h-6v-1h5v-5z" fill="${getProp("--ButtonShadow")}"/>
		<path d="M2 2h4v4h-4v-4z" fill="${getProp("--ButtonFace")}"/>
	`,
  );
  var inset_deep_border_image = border_image(
    2,
    `
		<path d="M0 0h7v1h-6v6h-1v-7z" fill="${getProp("--ButtonDkShadow")}"/>
		<path d="M7 0h1v8h-8v-1h7v-7z" fill="${getProp("--ButtonHilight")}"/>
		<path d="M1 1h5v1h-4v4h-1v-5z" fill="${getProp("--ButtonShadow")}"/>
		<path d="M6 1h1v6h-6v-1h5v-5z" fill="${getProp("--ButtonLight")}"/>
		<path d="M2 2h4v4h-4v-4z" fill="${getProp("--ButtonFace")}"/>
	`,
  );
  var button_default_border_image = border_image(
    3,
    `
		<path d="M0 0h8v8h-8v-8z" fill="${getProp("--ButtonDkShadow")}"/>
		<path d="M1 1h5v1h-4v4h-1v-5z" fill="${getProp("--ButtonHilight")}"/>
		<path d="M2 2h3v1h-2v2h-1v-3z" fill="${getProp("--ButtonLight")}"/>
		<path d="M5 2h1v4h-4v-1h3v-3z" fill="${getProp("--ButtonShadow")}"/>
		<path d="M3 3h2v2h-2v-2z" fill="${getProp("--ButtonFace")}"/>
		<rect x="0" y="0" width="8" height="8" stroke-width="2" stroke="${getProp(
      "--WindowFrame",
    )}" fill="none"/>
	`,
  );

  var fieldset_border_image =
    generate_url_svg_data_uri(
      `<svg width="5" height="5" fill="${getProp(
        "--ButtonShadow",
      )}" xmlns="http://www.w3.org/2000/svg">${generate_fieldset_border_svg()}</svg>`,
    ) + " 2";

  console.log("Compare");
  console.log(fieldset_border_image);
  console.log(button_active_border_image);
  var radio_button_svg = generate_url_svg_data_uri(
    `<svg width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_radio_button_svg(
      false,
      false,
    )}</svg>`,
  );
  var radio_button_active_svg = generate_url_svg_data_uri(
    `<svg width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_radio_button_svg(
      true,
      false,
    )}</svg>`,
  );
  var radio_button_disabled_svg = generate_url_svg_data_uri(
    `<svg width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_radio_button_svg(
      false,
      true,
    )}</svg>`,
  );
  var radio_dot_svg = generate_url_svg_data_uri(
    `<svg width="4" height="4" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_radio_dot_svg(
      false,
    )}</svg>`,
  );
  var radio_dot_disabled_svg = generate_url_svg_data_uri(
    `<svg width="4" height="4" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_radio_dot_svg(
      true,
    )}</svg>`,
  );
  var checkbox_svg = generate_url_svg_data_uri(
    `<svg width="7" height="7" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_checkbox_svg(
      false,
    )}</svg>`,
  );
  var checkbox_disabled_svg = generate_url_svg_data_uri(
    `<svg width="7" height="7" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_checkbox_svg(
      true,
    )}</svg>`,
  );
  var select_arrow_svg = generate_url_svg_data_uri(
    `<svg width="16" height="17" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_select_arrow_svg()}</svg>`,
  );
  var select_arrow_active_svg = generate_url_svg_data_uri(
    `<svg width="16" height="17" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_select_arrow_active_svg()}</svg>`,
  );
  var range_thumb_svg = generate_url_svg_data_uri(
    `<svg width="11" height="21" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_range_thumb_svg()}</svg>`,
  );
  var range_box_thumb_svg = generate_url_svg_data_uri(
    `<svg width="11" height="21" fill="none" xmlns="http://www.w3.org/2000/svg">${generate_range_box_thumb_svg()}</svg>`,
  );

  return {
    "--checker": checker,
    "--fieldset-border-image": fieldset_border_image,
    "--radio-button-svg": radio_button_svg,
    "--radio-button-active-svg": radio_button_active_svg,
    "--radio-button-disabled-svg": radio_button_disabled_svg,
    "--radio-dot-svg": radio_dot_svg,
    "--radio-dot-disabled-svg": radio_dot_disabled_svg,
    "--checkbox-svg": checkbox_svg,
    "--checkbox-disabled-svg": checkbox_disabled_svg,
    "--select-arrow-svg": select_arrow_svg,
    "--select-arrow-active-svg": select_arrow_active_svg,
    "--range-thumb-svg": range_thumb_svg,
    "--range-box-thumb-svg": range_box_thumb_svg,
    "--button-active-border-image": button_active_border_image,
    "--button-normal-border-image": button_normal_border_image,
    "--inset-deep-border-image": inset_deep_border_image,
    "--button-default-border-image": button_default_border_image,
    "--button-default-active-border-image":
      button_default_active_border_image,
    "--scrollbar-arrows-ButtonText": scrollbar_arrows_ButtonText,
    "--scrollbar-arrows-GrayText": scrollbar_arrows_GrayText,
    "--scrollbar-arrows-ButtonHilight": scrollbar_arrows_ButtonHilight,
    "--scrollbar-size": `${scrollbar_size}px`,
    "--scrollbar-button-inner-size": `${scrollbar_button_inner_size}px`,
  };
}

/**
 * @param {HTMLElement} element
 * @returns {Record<string, string>}
 * @private
 */
function getThemeCSSProperties(element) {
  const keys = [
    "--checker",
    "--button-active-border-image",
    "--button-normal-border-image",
    "--inset-deep-border-image",
    "--button-default-border-image",
    "--button-default-active-border-image",
    "--scrollbar-arrows-ButtonText",
    "--scrollbar-arrows-GrayText",
    "--scrollbar-arrows-ButtonHilight",
    "--scrollbar-size",
    "--scrollbar-button-inner-size",
    "--ActiveBorder",
    "--ActiveTitle",
    "--AppWorkspace",
    "--Background",
    "--ButtonAlternateFace",
    "--ButtonDkShadow",
    "--ButtonFace",
    "--ButtonHilight",
    "--ButtonLight",
    "--ButtonShadow",
    "--ButtonText",
    "--GradientActiveTitle",
    "--GradientInactiveTitle",
    "--GrayText",
    "--Hilight",
    "--HilightText",
    "--HotTrackingColor",
    "--InactiveBorder",
    "--InactiveTitle",
    "--InactiveTitleText",
    "--InfoText",
    "--InfoWindow",
    "--Menu",
    "--MenuText",
    "--Scrollbar",
    "--TitleText",
    "--Window",
    "--WindowFrame",
    "--WindowText",
  ];
  const style = window.getComputedStyle(element);
  /** @type {Record<string, string>} */
  const result = {};
  for (const key of keys) {
    result[key] = style.getPropertyValue(key);
  }
  return result;
}

/**
 * @param {HTMLElement} target
 * @param {HTMLElement} source
 * @private
 */
function inheritTheme(target, source) {
  applyCSSProperties(getThemeCSSProperties(source), {
    element: target,
    recurseIntoIframes: true,
  });
}

// Parse NonClientMetrics
// https://docs.microsoft.com/en-us/windows/win32/controls/themesfileformat-overview?redirectedfrom=MSDN#metrics-section
// https://docs.microsoft.com/en-us/windows/win32/winprog/windows-data-types

// using https://github.com/toji/js-struct

// var NonClientMetricsStruct = Struct.create(
//     Struct.uint32("cbSize"),
//     Struct.int32("iBorderWidth"),
//     Struct.int32("iScrollWidth"),
//     Struct.int32("iScrollHeight"),
//     Struct.int32("iCaptionWidth"),
//     Struct.int32("iCaptionHeight"),
// 	// after that, it may be W or A
// //   LOGFONTW lfCaptionFont;
// //   int      iSmCaptionWidth;
// //   int      iSmCaptionHeight;
// //   LOGFONTW lfSmCaptionFont;
// //   int      iMenuWidth;
// //   int      iMenuHeight;
// //   LOGFONTW lfMenuFont;
// //   LOGFONTW lfStatusFont;
// //   LOGFONTW lfMessageFont;
// //   int      iPaddedBorderWidth;
// );

// var NonClientMetrics_buffer = new Uint8Array(NonClientMetrics_string.split(" ").map((str)=> parseInt(str))).buffer;

// NonClientMetricsStruct.readStructs(NonClientMetrics_buffer, 0, 1)[0];

/**
 * @param {string} themeIni
 * @returns {{name: string, value: string}[] | undefined}
 */
function getColorsFromThemeFile(themeIni) {
  try {
    const theme = parseINIString(themeIni);
    const colorsSection = theme["Control Panel\\Colors"];
    if (!colorsSection) {
      console.error("Invalid theme file, no [Control Panel\\Colors] section");
      return undefined;
    }
    if (typeof colorsSection !== "object") {
      console.error(
        "Invalid theme file, 'Control Panel\\Colors' is not a section",
      );
      return undefined;
    }

    const colors = [];
    for (const k in colorsSection) {
      // for .themepack file support, just ignore bad keys that were parsed
      if (!k.match(/\W/)) {
        const val = colorsSection[k].trim().split(/\s+/).join(", ");
        colors.push({
          name: k,
          value: `rgb(${val})`,
        });
      }
    }
    console.log("Parsed colors from theme file:", colors);
    return colors;
  } catch (e) {
    console.error("Error in getColorsFromThemeFile:", e);
    return undefined;
  }
}

/**
 * Resolves theme paths like %ThemeDir% and %Windir% and normalizes backslashes.
 * @param {string} path
 * @param {string} themeDir
 * @returns {string}
 */
function resolveThemePath(path, themeDir) {
  if (!path || path === "(None)") return "";
  let resolved = path
    .replace(/%ThemeDir%/gi, themeDir + "\\")
    .replace(/%Windir%/gi, "C:\\WINDOWS\\")
    .replace(/\\/g, "/");

  // Normalize multiple slashes to a single slash
  resolved = resolved.replace(/\/+/g, "/");

  if (/^[A-Z]:\//i.test(resolved)) {
    resolved = "/" + resolved;
  }
  return resolved;
}

/**
 * @param {string} themeIni
 * @param {string} themeDir
 * @returns {string | undefined}
 */
function getWallpaperFromThemeFile(themeIni, themeDir = "C:\\WINDOWS") {
  const config = getDesktopConfigFromThemeFile(themeIni, themeDir);
  return config?.wallpaper;
}

/**
 * @param {string} themeIni
 * @param {string} themeDir
 * @returns {Record<string, string> | undefined}
 */
function getIconsFromThemeFile(themeIni, themeDir = "C:\\WINDOWS") {
  const theme = parseINIString(themeIni);
  /** @type {Record<string, string>} */
  const icons = {};

  const myComputerSection =
    theme["CLSID\\{20D04FE0-3AEA-1069-A2D8-08002B30309D}\\DefaultIcon"];
  if (myComputerSection && typeof myComputerSection === "object") {
    icons.myComputer = resolveThemePath(
      myComputerSection["DefaultValue"]?.split(",")[0],
      themeDir,
    );
  }

  const networkSection =
    theme["CLSID\\{208D2C60-3AEA-1069-A2D7-08002B30309D}\\DefaultIcon"];
  if (networkSection && typeof networkSection === "object") {
    icons.networkNeighborhood = resolveThemePath(
      networkSection["DefaultValue"]?.split(",")[0],
      themeDir,
    );
  }

  const recycleBinSection =
    theme["CLSID\\{645FF040-5081-101B-9F08-00AA002F954E}\\DefaultIcon"];
  if (recycleBinSection && typeof recycleBinSection === "object") {
    icons.recycleBinFull = resolveThemePath(
      recycleBinSection["full"]?.split(",")[0],
      themeDir,
    );
    icons.recycleBinEmpty = resolveThemePath(
      recycleBinSection["empty"]?.split(",")[0],
      themeDir,
    );
  }

  return Object.keys(icons).length > 0 ? icons : undefined;
}

/**
 * @param {string} themeIni
 * @param {string} themeDir
 * @returns {Record<string, string> | undefined}
 */
function getCursorsFromThemeFile(themeIni, themeDir = "C:\\WINDOWS") {
  const theme = parseINIString(themeIni);
  const cursorsSection = theme["Control Panel\\Cursors"];
  if (!cursorsSection || typeof cursorsSection !== "object") return undefined;

  /** @type {Record<string, string>} */
  const cursors = {};
  const mapping = {
    Arrow: "arrow",
    Help: "help",
    AppStarting: "wait",
    Wait: "busy",
    NWPen: "pen",
    No: "no",
    SizeNS: "sizeNS",
    SizeWE: "sizeWE",
    SizeNWSE: "sizeNWSE",
    SizeNESW: "sizeNESW",
    SizeAll: "move",
    UpArrow: "up",
    IBeam: "beam",
    Crosshair: "cross",
  };

  for (const [winKey, appKey] of Object.entries(mapping)) {
    if (cursorsSection[winKey]) {
      cursors[appKey] = resolveThemePath(cursorsSection[winKey], themeDir);
    }
  }

  return Object.keys(cursors).length > 0 ? cursors : undefined;
}

/**
 * @param {string} themeIni
 * @param {string} themeDir
 * @returns {Record<string, string> | undefined}
 */
function getSoundsFromThemeFile(themeIni, themeDir = "C:\\WINDOWS") {
  const theme = parseINIString(themeIni);
  /** @type {Record<string, string>} */
  const sounds = {};

  const prefix = "AppEvents\\Schemes\\Apps\\.Default\\";
  const suffix = "\\.Current";

  const events = [
    "SystemAsterisk",
    "SystemExclamation",
    "SystemHand",
    "SystemQuestion",
    "SystemExit",
    "WindowsLogon",
    "AppGPFault",
    "Maximize",
    "Minimize",
    "RestoreDown",
    "RestoreUp",
    "MenuCommand",
    "MenuPopup",
  ];

  for (const event of events) {
    const sectionName = `${prefix}${event}${suffix}`;
    const section = theme[sectionName];
    if (section && typeof section === "object") {
      const path = section["DefaultValue"];
      if (path) {
        sounds[event] = resolveThemePath(path, themeDir);
      }
    }
  }

  // Explorer specific
  const recycleSection =
    theme[
      "AppEvents\\Schemes\\Apps\\Explorer\\EmptyRecycleBin\\.Current"
    ];
  if (recycleSection && typeof recycleSection === "object") {
    const path = recycleSection["DefaultValue"];
    if (path) {
      sounds.EmptyRecycleBin = resolveThemePath(path, themeDir);
    }
  }

  return Object.keys(sounds).length > 0 ? sounds : undefined;
}

/**
 * @param {string} themeIni
 * @param {string} themeDir
 * @returns {Record<string, any> | undefined}
 */
function getDesktopConfigFromThemeFile(themeIni, themeDir = "C:\\WINDOWS") {
  const theme = parseINIString(themeIni);
  const desktopSection = theme["Control Panel\\Desktop"];
  if (!desktopSection || typeof desktopSection !== "object") return undefined;

  const config = {};
  if (desktopSection["Wallpaper"]) {
    config.wallpaper = resolveThemePath(desktopSection["Wallpaper"], themeDir);
  }

  if (desktopSection["Tilewallpaper"] !== undefined) {
    config.tileWallpaper = desktopSection["Tilewallpaper"];
  }

  if (desktopSection["WallpaperStyle"] !== undefined) {
    config.wallpaperStyle = desktopSection["WallpaperStyle"];
  }

  if (desktopSection["Pattern"]) {
    config.pattern = desktopSection["Pattern"];
  }

  return config;
}

/**
 * @param {{name: string, value: string}[]} colors
 * @returns {Record<string, string>}
 */
function generateThemePropertiesFromColors(colors) {
  try {
    /** @type {Record<string, string>} */
    const cssProperties = {};
    for (const color of colors) {
      cssProperties[`--${color.name}`] = color.value;
    }

    const graphics = renderThemeGraphics(cssProperties);
    const combined = Object.assign({}, graphics, cssProperties);
    return combined;
  } catch (e) {
    console.error("Error in generateThemePropertiesFromColors:", e);
    return {};
  }
}

/**
 * @param {string} themeIni
 * @returns {Record<string, string> | undefined}
 */
function parseThemeFileString(themeIni) {
  // .theme is a renamed .ini text file
  // .themepack is a renamed .cab file, and parsing it as .ini seems to work well enough for the most part, as the .ini data appears in plain,
  // but it may not if compression is enabled for the .cab file
  const colors = getColorsFromThemeFile(themeIni);
  if (!colors) {
    alert("Invalid theme file, no [Control Panel\\Colors] section");
    console.log(parseINIString(themeIni));
    return;
  }

  return generateThemePropertiesFromColors(colors);
}

/**
 * @param {Record<string, string> | CSSStyleDeclaration} cssProperties
 * @param {{ element?: HTMLElement, recurseIntoIframes?: boolean } | HTMLElement} [options]
 */
function applyCSSProperties(cssProperties, options = {}) {
  // @TODO: clean up deprecated argument handling
  /** @type {HTMLElement} */
  let element;
  /** @type {boolean} */
  let recurseIntoIframes;
  if ("tagName" in options) {
    console.warn(
      "deprecated: use options argument to applyCSSProperties, e.g. applyCSSProperties(cssProperties, { element: document.documentElement, recurseIntoIframes: true })",
    );
    element = options;
    recurseIntoIframes = false;
  } else {
    ({ element = document.documentElement, recurseIntoIframes = false } =
      options);
  }

  /**
   * @param {string} propName
   * @returns {string}
   */
  var getProp = (propName) =>
    typeof cssProperties.getPropertyValue === "function"
      ? cssProperties.getPropertyValue(propName)
      : /** @type {Record<string, string>} */ (cssProperties)[propName];
  for (var k in cssProperties) {
    element.style.setProperty(k, getProp(k));
  }
  // iframe theme propagation
  if (recurseIntoIframes) {
    var iframes = element.querySelectorAll("iframe");
    for (var i = 0; i < iframes.length; i++) {
      try {
        applyCSSProperties(cssProperties, {
          element: iframes[i].contentDocument?.documentElement,
          recurseIntoIframes: true,
        });
      } catch (error) {
        // ignore
        // @TODO: share warning with $Window's iframe handling
      }
    }
  }
}

/**
 * @param {Record<string, string>} cssProperties
 * @returns {string}
 */
function makeThemeCSSFile(cssProperties) {
  var css = `
/* This is a generated file. */
/* spell-checker: disable */
:root {
`;
  for (var k in cssProperties) {
    if (k.startsWith("--")) {
      css += `\t${k}: ${cssProperties[k]};\n`;
    }
  }
  css += `}
`;
  return css;
}

// @TODO: should this be part of theme graphics generation?
// I want to figure out a better way to do dynamic theme features,
// where it works with the CSS cascade as much as possible
function makeBlackToInsetFilter() {
  if (document.getElementById("os-gui-black-to-inset-filter")) {
    return;
  }
  const svg_xml = `
		<svg style="position: absolute; pointer-events: none; bottom: 100%;">
			<defs>
				<filter id="os-gui-black-to-inset-filter" x="0" y="0" width="1px" height="1px">
					<feColorMatrix
						in="SourceGraphic"
						type="matrix"
						values="
							1 0 0 0 0
							0 1 0 0 0
							0 0 1 0 0
							-1000 -1000 -1000 1 0
						"
						result="black-parts-isolated"
					/>
					<feFlood result="shadow-color" flood-color="var(--ButtonShadow)"/>
					<feFlood result="hilight-color" flood-color="var(--ButtonHilight)"/>
					<feOffset in="black-parts-isolated" dx="1" dy="1" result="offset"/>
					<feComposite in="hilight-color" in2="offset" operator="in" result="hilight-colored-offset"/>
					<feComposite in="shadow-color" in2="black-parts-isolated" operator="in" result="shadow-colored"/>
					<feMerge>
						<feMergeNode in="hilight-colored-offset"/>
						<feMergeNode in="shadow-colored"/>
					</feMerge>
				</filter>
			</defs>
		</svg>
	`;
  const $svg = $(svg_xml);
  $svg.appendTo("body");
}
