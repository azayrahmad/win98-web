import { ICONS } from '../config/icons.js';

const AccessKeys = {
    escape: function (label) {
        return label.replace(/&/g, "&&");
    },
    unescape: function (label) {
        return label.replace(/&&/g, "&");
    },
    indexOf: function (label) {
        return ` ${label}`.search(/[^&]&[^&\s]/);
    },
    has: function (label) {
        return this.indexOf(label) >= 0;
    },
    get: function (label) {
        const index = this.indexOf(label);
        if (index >= 0) {
            return label.charAt(index + 1).toUpperCase();
        }
        return null;
    },
    remove: function (label) {
        const parentheticalRegex = /\s?\(&[^&]\)/;
        if (parentheticalRegex.test(label)) {
            return this.unescape(label.replace(parentheticalRegex, ""));
        }
        return this.toText(label);
    },
    toText: function (label) {
        const index = this.indexOf(label);
        if (index >= 0) {
            return (
                this.unescape(label.substring(0, index)) +
                this.unescape(label.substring(index + 1))
            );
        }
        return this.unescape(label);
    },
    toHTML: function (label) {
        const fragment = this.toFragment(label);
        const dummy = document.createElement("div");
        dummy.appendChild(fragment);
        return dummy.innerHTML;
    },
    toFragment: function (label) {
        const fragment = document.createDocumentFragment();
        const index = this.indexOf(label);
        if (index >= 0) {
            fragment.appendChild(
                document.createTextNode(this.unescape(label.substring(0, index))),
            );
            const span = document.createElement("span")
            span.className = "menu-hotkey"
            span.appendChild(document.createTextNode(label.charAt(index + 1)));
            fragment.appendChild(span);
            fragment.appendChild(
                document.createTextNode(this.unescape(label.substring(index + 2))),
            );
        } else {
            fragment.appendChild(document.createTextNode(this.unescape(label)));
        }
        return fragment;
    },
};


function createShutdownDialogContent() {
    const container = document.createElement('div');
    container.className = 'shutdown-dialog-content';

    const icon = document.createElement('img');
    icon.src = ICONS.shutdown[32]; // Placeholder icon
    icon.className = 'shutdown-dialog-icon';
    icon.width = 32;
    icon.height = 32;
    container.appendChild(icon);

    const textAndOptions = document.createElement('div');
    textAndOptions.className = 'shutdown-dialog-main';

    const text = document.createElement('p');
    text.textContent = 'What do you want the computer to do?';
    textAndOptions.appendChild(text);

    const options = [
        { id: 'standby', label: 'Stand &by', checked: false, disabled: true },
        { id: 'shutdown', label: 'Shut &down', checked: true },
        { id: 'restart', label: '&Restart', checked: false },
        { id: 'restart-msdos', label: 'Restart in MS-&DOS mode', checked: false, disabled: true }
    ];

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'shutdown-dialog-options';

    options.forEach(opt => {
        const fieldRow = document.createElement('div');
        fieldRow.className = 'field-row';

        const input = document.createElement('input');
        input.type = 'radio';
        input.id = opt.id;
        input.name = 'shutdown-option';
        input.value = opt.id;
        input.checked = opt.checked;
        if (opt.disabled) {
            input.disabled = true;
        }

        const label = document.createElement('label');
        label.htmlFor = opt.id;
        label.appendChild(AccessKeys.toFragment(opt.label));

        fieldRow.appendChild(input);
        fieldRow.appendChild(label);
        optionsContainer.appendChild(fieldRow);
    });

    textAndOptions.appendChild(optionsContainer);
    container.appendChild(textAndOptions);

    return container;
}

export { createShutdownDialogContent };
