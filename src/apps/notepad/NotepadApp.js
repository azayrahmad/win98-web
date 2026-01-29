import { Application } from '../Application.js';
import { fs } from "@zenfs/core";
import { initFileSystem } from "../../utils/zenfs-init.js";
import './notepad.css';
import '../../components/notepad-editor.css';
import { languages } from '../../config/languages.js';
import { HIGHLIGHT_JS_THEMES } from '../../config/highlight-js-themes.js';
import { getItem, setItem, LOCAL_STORAGE_KEYS } from '../../utils/localStorage.js';
import { ShowDialogWindow } from '../../components/DialogWindow.js';
import { NotepadEditor } from '../../components/NotepadEditor.js';
import { renderHTML } from '../../utils/domUtils.js';
import { ICONS } from '../../config/icons.js';

const DEFAULT_THEME = 'atom-one-light';

export class NotepadApp extends Application {
    static config = {
        id: "notepad",
        title: "Notepad",
        description: "A simple text editor.",
        icon: ICONS.notepad,
        width: 600,
        height: 400,
        resizable: true,
        isSingleton: false,
        tips: [
            "Notepad can be used for more than just text. It also supports syntax highlighting for various programming languages.",
            "In Notepad, you can format your code using the 'Format' option in the 'File' menu.",
            "You can preview Markdown files in Notepad by selecting 'Preview Markdown' from the 'View' menu.",
            "Notepad can copy text with syntax highlighting. Use 'Copy with Formatting' from the 'Edit' menu.",
        ],
    };

    constructor(config) {
        super(config);
        this.wordWrap = getItem(LOCAL_STORAGE_KEYS.NOTEPAD_WORD_WRAP) ?? false;
        this.currentLanguage = 'text';
        this.win = null;
        this.editor = null;
        this.findWindow = null;
    }

    _createWindow() {
        this.win = new $Window({
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            icons: this.icon,
        });

        this.menuBar = this._createMenuBar();
        this.win.setMenuBar(this.menuBar);

        this.win.$content.append('<div class="notepad-container"></div>');
        return this.win;
    }

    _createMenuBar() {
        return new MenuBar({
            "&File": [
                {
                    label: "&New",
                    shortcutLabel: "Ctrl+N",
                    action: () => this.clearContent(),
                },
                {
                    label: "&Open",
                    shortcutLabel: "Ctrl+O",
                    action: () => this.openFile(),
                },
                {
                    label: "&Save",
                    shortcutLabel: "Ctrl+S",
                    action: () => this.saveFile(),
                },
                {
                    label: "Save &Locally",
                    action: () => this.saveLocally(),
                    enabled: () => !!this.zenfsPath,
                },
                {
                    label: "Save &As...",
                    action: () => this.saveAs(),
                },
                "MENU_DIVIDER",
                {
                    label: "E&xit",
                    action: () => this.win.close(),
                },
            ],
            "&Edit": [
                {
                    label: "&Undo",
                    shortcutLabel: "Ctrl+Z",
                    action: () => document.execCommand("undo"),
                },
                "MENU_DIVIDER",
                {
                    label: "Cu&t",
                    shortcutLabel: "Ctrl+X",
                    action: () => document.execCommand("cut"),
                },
                {
                    label: "&Copy",
                    shortcutLabel: "Ctrl+C",
                    action: () => this.copyFormattedCode(),
                },
                {
                    label: "&Paste",
                    shortcutLabel: "Ctrl+V",
                    action: () => this.pasteText(),
                },
                {
                    label: "De&lete",
                    shortcutLabel: "Del",
                    action: () => document.execCommand("delete"),
                },
                "MENU_DIVIDER",
                {
                    label: "Select &All",
                    shortcutLabel: "Ctrl+A",
                    action: () => this.editor.codeInput.select(),
                },
                "MENU_DIVIDER",
                {
                    label: "&Word Wrap",
                    checkbox: {
                        check: () => this.wordWrap,
                        toggle: () => this.toggleWordWrap(),
                    },
                },
            ],
            "&Search": [
                {
                    label: "&Find...",
                    shortcutLabel: "Ctrl+F",
                    action: () => this.showFindDialog(),
                },
                {
                    label: "Find &Next",
                    shortcutLabel: "F3",
                    action: () => this.findNext(),
                    enabled: () => this.findState?.term,
                },
            ],
            "&Code": [
                {
                    label: "&Language",
                    submenu: [
                        {
                            radioItems: languages.map(lang => ({ label: lang.name, value: lang.id })),
                            getValue: () => this.currentLanguage,
                            setValue: (value) => this.setLanguage(value),
                        },
                    ]
                },
                {
                    label: "&Theme",
                    submenu: [
                        {
                            radioItems: HIGHLIGHT_JS_THEMES.map(theme => ({ label: theme, value: theme })),
                            getValue: () => this.currentTheme,
                            setValue: (value) => this.setTheme(value),
                        },
                    ]
                },
                {
                    label: "HTML/Markdown Preview",
                    action: () => this.previewMarkdown(),
                },
                "MENU_DIVIDER",
                {
                    label: "&Format",
                    shortcutLabel: "Ctrl+Shift+F",
                    action: () => this.formatCode(),
                },
            ],
            "&Help": [
                {
                    label: "&About Notepad",
                    action: () => alert("A simple text editor."),
                },
            ],
        });
    }

    async _onLaunch(data) {
        const container = this.win.$content.find('.notepad-container')[0];
        this.editor = new NotepadEditor(container, {
            win: this.win,
            onInput: () => {
                this.isDirty = true;
                this.updateTitle();
            }
        });

        this.editor.setWordWrap(this.wordWrap);

        this.fileHandle = null;
        this.zenfsPath = null;
        this.isDirty = false;
        this.fileName = 'Untitled';
        this.findState = {
            term: '',
            caseSensitive: false,
            direction: 'down',
        };

        this.updateTitle();

        if (typeof data === "string") {
            const isZenFSPath = data.startsWith('/') && !data.startsWith('http');
            if (isZenFSPath) {
                try {
                    await initFileSystem();
                    const text = await fs.promises.readFile(data, 'utf8');
                    this.zenfsPath = data;
                    this.fileName = data.split("/").pop();
                    this.editor.setValue(text);
                    this.isDirty = false;
                    this.updateTitle();
                    this.setLanguage(this.getLanguageFromExtension(this.fileName));
                } catch (e) {
                    console.error("Error loading from ZenFS:", e);
                    ShowDialogWindow({
                        title: "Error",
                        text: `Could not open file from ZenFS: ${data}`,
                        buttons: [{ label: "OK", isDefault: true }],
                    });
                }
            } else {
                // It's a file path
                fetch(data)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.text();
                    })
                    .then((text) => {
                        this.fileName = data.split("/").pop();
                        this.editor.setValue(text);
                        this.isDirty = false;
                        this.updateTitle();
                        this.setLanguage(this.getLanguageFromExtension(this.fileName));
                    })
                    .catch((e) => {
                        console.error("Error loading file:", e);
                        ShowDialogWindow({
                            title: "Error",
                            text: `Could not open file: ${data}`,
                            buttons: [{ label: "OK", isDefault: true }],
                        });
                    });
            }
        } else if (data && typeof data === "object") {
          // It's a file object from drag-and-drop or file open
          if (data.content) {
            this.fileName = data.name;
            const content = atob(data.content.split(",")[1]);
            this.editor.setValue(content);
            this.isDirty = false;
            this.updateTitle();
            this.setLanguage(this.getLanguageFromExtension(this.fileName));
          } else {
            // Assumes it's a File-like object
            const file = data;
            this.fileName = file.name;
            this.fileHandle = null;
            this.isDirty = false;
            this.updateTitle();
            this.setLanguage(this.getLanguageFromExtension(file.name));

            const reader = new FileReader();
            reader.onload = (event) => {
              this.editor.setValue(event.target.result);
              this.isDirty = false; // Reset dirty flag after loading
              this.updateTitle();
            };
            reader.onerror = (e) => {
              console.error("Error reading file:", e);
              ShowDialogWindow({
                title: "Error",
                text: `Could not read file: ${file.name}`,
                buttons: [{ label: "OK", isDefault: true }],
              });
            };
            reader.readAsText(file);
          }
        }

        const notepadContainer = this.win.$content.find('.notepad-container')[0];
        notepadContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            notepadContainer.classList.add('dragover');
        });

        notepadContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            notepadContainer.classList.remove('dragover');
        });

        notepadContainer.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            notepadContainer.classList.remove('dragover');

            if (await this.checkForUnsavedChanges() === 'cancel') return;

            const files = e.dataTransfer.files;
            if (files.length !== 1) {
                alert('Please drop a single file.');
                return;
            }
            const file = files[0];

            this.fileName = file.name;
            this.fileHandle = null;
            this.isDirty = false;
            this.updateTitle();
            this.setLanguage(this.getLanguageFromExtension(file.name));

            const reader = new FileReader();
            reader.onload = (event) => {
                this.editor.setValue(event.target.result);
                this.isDirty = false;
                this.updateTitle();
            };
            reader.readAsText(file);
        });

        this.win.on('close', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                this.showUnsavedChangesDialogOnClose();
            }
        });

        this.currentTheme = getItem(LOCAL_STORAGE_KEYS.NOTEPAD_THEME) || DEFAULT_THEME;
        this.setTheme(this.currentTheme, true);

        // Set initial language in case of no file, then update menu
        this.setLanguage(this.currentLanguage);
    }

    setTheme(theme, isInitialLoad = false) {
        if (!isInitialLoad && theme === this.currentTheme) return;

        const themeUrl = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${theme}.min.css`;
        const existingLink = document.getElementById('highlightjs-theme');

        if (existingLink) {
            existingLink.href = themeUrl;
        } else {
            const link = document.createElement('link');
            link.id = 'highlightjs-theme';
            link.rel = 'stylesheet';
            link.href = themeUrl;
            document.head.appendChild(link);
        }

        this.currentTheme = theme;
        setItem(LOCAL_STORAGE_KEYS.NOTEPAD_THEME, theme);

        if (!isInitialLoad) {
            this.win.element.querySelector('.menus').dispatchEvent(new CustomEvent('update'));
        }
    }

    toggleWordWrap() {
        this.wordWrap = !this.wordWrap;
        this.editor.setWordWrap(this.wordWrap);
        setItem(LOCAL_STORAGE_KEYS.NOTEPAD_WORD_WRAP, this.wordWrap);
        this.win.element.querySelector('.menus').dispatchEvent(new CustomEvent('update'));
    }

    _createFindWindow() {
        this.findWindow = new $Window({
            title: 'Find',
            outerWidth: 400,
            toolWindow: true,
            parentWindow: this.win,
            resizable: false,
        });

        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = 'display: flex; padding: 15px 10px; align-items: flex-start;';

        const mainContent = document.createElement('div');
        mainContent.style.cssText = 'display: flex; flex-direction: column; flex-grow: 1; margin-right: 10px;';

        const findWhatRow = document.createElement('div');
        findWhatRow.style.cssText = 'display: flex; align-items: center; margin-bottom: 15px;';
        findWhatRow.innerHTML = `
            <label for="find-text" style="margin-right: 5px; white-space: nowrap;">Find what:</label>
            <input type="text" id="find-text" value="${this.findState.term}" style="flex-grow: 1;">
        `;
        mainContent.appendChild(findWhatRow);

        const optionsRow = document.createElement('div');
        optionsRow.style.cssText = 'display: flex; align-items: center;';

        const matchCaseContainer = document.createElement('div');
        matchCaseContainer.className = 'field-row';
        matchCaseContainer.innerHTML = `
            <input type="checkbox" id="match-case" ${this.findState.caseSensitive ? 'checked' : ''}>
            <label for="match-case">Match case</label>
        `;
        optionsRow.appendChild(matchCaseContainer);

        const directionGroup = document.createElement('fieldset');
        directionGroup.className = 'group-box';
        directionGroup.style.cssText = 'padding: 5px 10px; margin-left: 20px;';
        directionGroup.innerHTML = `
            <legend>Direction</legend>
            <div class="field-row" style="justify-content: flex-start;">
                <input type="radio" name="direction" id="dir-up" value="up" ${this.findState.direction === 'up' ? 'checked' : ''}>
                <label for="dir-up">Up</label>
            </div>
            <div class="field-row" style="justify-content: flex-start;">
                <input type="radio" name="direction" id="dir-down" value="down" ${this.findState.direction === 'down' ? 'checked' : ''}>
                <label for="dir-down">Down</label>
            </div>
        `;
        optionsRow.appendChild(directionGroup);
        mainContent.appendChild(optionsRow);

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
        buttonGroup.innerHTML = `
            <button id="find-next-btn" style="width: 75px;">Find Next</button>
            <button id="cancel-btn" style="width: 75px;">Cancel</button>
        `;

        contentContainer.appendChild(mainContent);
        contentContainer.appendChild(buttonGroup);

        this.findWindow.$content.append(contentContainer);

        const findInput = contentContainer.querySelector('#find-text');
        const findNextBtn = contentContainer.querySelector('#find-next-btn');
        const cancelBtn = contentContainer.querySelector('#cancel-btn');

        findNextBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        findNextBtn.addEventListener('click', () => {
            const term = findInput.value;
            if (!term) return;

            this.findState.term = term;
            this.findState.caseSensitive = contentContainer.querySelector('#match-case').checked;
            this.findState.direction = contentContainer.querySelector('input[name="direction"]:checked').value;

            this.findNext();
        });

        cancelBtn.addEventListener('click', () => {
            this.findWindow.close();
        });

        const updateFindState = () => {
            if (!this.findWindow || this.findWindow.closed) return;
            this.findState.term = findInput.value;
            this.findState.caseSensitive = contentContainer.querySelector('#match-case').checked;
            this.findState.direction = contentContainer.querySelector('input[name="direction"]:checked').value;
        };

        this.findWindow.onClosed(() => {
            updateFindState();
            this.findWindow = null;
        });

        this.findWindow.element.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.findWindow.close();
            }
        });

        setTimeout(() => {
            findInput.focus();
            findInput.select();
            this.findWindow.setDimensions({ innerHeight: contentContainer.offsetHeight });
        }, 0);
    }

    showFindDialog() {
        if (!this.findWindow || this.findWindow.closed) {
            this._createFindWindow();
        } else {
            this.findWindow.focus();
        }
    }

    _scrollToSelection(textarea) {
        const text = textarea.value;
        const selectionStart = textarea.selectionStart;

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        // Use scrollWidth to account for horizontal overflow
        tempDiv.style.width = textarea.scrollWidth + 'px';

        const styles = window.getComputedStyle(textarea);
        tempDiv.style.whiteSpace = styles.whiteSpace;
        tempDiv.style.overflowWrap = styles.overflowWrap;
        [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
            'lineHeight', 'paddingTop', 'paddingLeft', 'paddingRight', 'paddingBottom',
            'borderTopWidth', 'borderLeftWidth', 'borderRightWidth', 'borderBottomWidth'
        ].forEach(prop => {
            tempDiv.style[prop] = styles[prop];
        });

        const textBefore = document.createTextNode(text.substring(0, selectionStart));
        const selectionSpan = document.createElement('span');
        selectionSpan.textContent = text.substring(selectionStart, textarea.selectionEnd);

        tempDiv.appendChild(textBefore);
        tempDiv.appendChild(selectionSpan);
        // Append the rest of the text to ensure correct layout
        const textAfter = document.createTextNode(text.substring(textarea.selectionEnd));
        tempDiv.appendChild(textAfter);

        document.body.appendChild(tempDiv);

        const spanTop = selectionSpan.offsetTop;
        const spanLeft = selectionSpan.offsetLeft;
        const spanHeight = selectionSpan.offsetHeight;
        const spanWidth = selectionSpan.offsetWidth;

        document.body.removeChild(tempDiv);

        // Vertical scroll adjustment
        const scrollTop = textarea.scrollTop;
        const clientHeight = textarea.clientHeight;
        if (spanTop < scrollTop || (spanTop + spanHeight) > (scrollTop + clientHeight)) {
            // Center the found text vertically
            textarea.scrollTop = spanTop - (clientHeight / 2) + (spanHeight / 2);
        }

        // Horizontal scroll adjustment
        const scrollLeft = textarea.scrollLeft;
        const clientWidth = textarea.clientWidth;
        if (spanLeft < scrollLeft || (spanLeft + spanWidth) > (scrollLeft + clientWidth)) {
            // Center the found text horizontally
            textarea.scrollLeft = spanLeft - (clientWidth / 2) + (spanWidth / 2);
        }
    }

    findNext() {
        const { term, caseSensitive, direction } = this.findState;
        if (!term) {
            this.showFindDialog();
            return;
        }

        const editor = this.editor.codeInput;
        editor.focus(); // Focus the editor first to get the correct selection state
        const text = editor.value;
        const searchTerm = caseSensitive ? term : term.toLowerCase();
        const textToSearch = caseSensitive ? text : text.toLowerCase();

        let index;
        let currentPos = editor.selectionEnd;

        if (direction === 'down') {
            // If there's a selection, start searching after it.
            // Otherwise, start from the current cursor position.
            if (editor.selectionStart !== editor.selectionEnd) {
                currentPos = editor.selectionEnd;
            } else {
                currentPos = editor.selectionEnd > 0 ? editor.selectionEnd : 0;
            }
            index = textToSearch.indexOf(searchTerm, currentPos);
            // Wrap around if not found
            if (index === -1) {
                index = textToSearch.indexOf(searchTerm);
            }
        } else { // direction === 'up'
            currentPos = editor.selectionStart;
            index = textToSearch.lastIndexOf(searchTerm, currentPos - 1);
            // Wrap around if not found
            if (index === -1) {
                index = textToSearch.lastIndexOf(searchTerm);
            }
        }

        if (index !== -1) {
            editor.focus();
            editor.setSelectionRange(index, index + term.length);
            this._scrollToSelection(editor);
        } else {
            ShowDialogWindow({
                title: 'Notepad',
                text: `Cannot find "${term}"`,
                soundEvent: 'SystemHand',
                buttons: [{ label: 'OK', isDefault: true }],
            });
        }
    }

    showUnsavedChangesDialog(options = {}) {
        return ShowDialogWindow({
            title: 'Notepad',
            text: `<div style="white-space: pre-wrap">The text in the ${this.fileName} file has changed.\n\nDo you want to save the changes?</div>`,
            contentIconUrl: new URL('../../assets/icons/msg_warning-0.png', import.meta.url).href,
            modal: true,
            soundEvent: 'SystemQuestion',
            buttons: options.buttons || [],
        });
    }

    showUnsavedChangesDialogOnClose() {
        this.showUnsavedChangesDialog({
            buttons: [
                {
                    label: 'Yes',
                    action: async () => {
                        await this.saveFile();
                        if (!this.isDirty) this.win.close(true);
                        else return false;
                    },
                    isDefault: true,
                },
                { label: 'No', action: () => this.win.close(true) },
                { label: 'Cancel' }
            ],
        });
    }

    async checkForUnsavedChanges() {
        if (!this.isDirty) return 'continue';
        return new Promise(resolve => {
            this.showUnsavedChangesDialog({
                buttons: [
                    {
                        label: 'Yes',
                        action: async () => {
                            await this.saveFile();
                            resolve(!this.isDirty ? 'continue' : 'cancel');
                        },
                        isDefault: true,
                    },
                    { label: 'No', action: () => resolve('continue') },
                    { label: 'Cancel', action: () => resolve('cancel') }
                ],
            });
        });
    }

    updateTitle() {
        const dirtyIndicator = this.isDirty ? '*' : '';
        this.win.title(`${dirtyIndicator}${this.fileName} - Notepad`);
        if (this.win) {
            this.menuBar = this._createMenuBar();
            this.win.setMenuBar(this.menuBar);
        }
    }

    previewMarkdown() {
        const html = marked.parse(this.editor.getValue());
        const previewWindow = new $Window({
            title: 'HTML/Markdown Preview',
            innerWidth: 600,
            innerHeight: 400,
            resizable: true,
        });

        const previewContainer = document.createElement('div');
        previewContainer.className = 'markdown-preview-container';
        previewContainer.style.height = '100%';
        previewContainer.style.display = 'flex';
        previewContainer.style.flexDirection = 'column';

        const contentArea = document.createElement('div');
        contentArea.className = 'markdown-preview-content';
        contentArea.style.flexGrow = '1';
        contentArea.style.overflow = 'auto';

        const footer = document.createElement('div');
        footer.className = 'markdown-preview-footer';
        footer.style.textAlign = 'right';
        footer.style.padding = '5px';
        footer.innerHTML = '<button class="copy-button">Copy HTML</button>';

        previewContainer.appendChild(contentArea);
        previewContainer.appendChild(footer);
        previewWindow.$content.append(previewContainer);

        renderHTML(contentArea, html, 'markdown-preview sunken-panel');

        footer.querySelector('.copy-button').addEventListener('click', (e) => {
            navigator.clipboard.writeText(html).then(() => {
                e.target.textContent = 'Copied!';
                setTimeout(() => e.target.textContent = 'Copy HTML', 2000);
            });
        });
    }

    getLanguageFromExtension(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const language = languages.find(lang => lang.extensions.includes(extension));
        return language ? language.id : 'text';
    }

    async openFile() {
        if (await this.checkForUnsavedChanges() === 'cancel') return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = languages.flatMap(lang => lang.extensions.map(ext => `.${ext}`)).join(',');
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            this.fileName = file.name;
            this.fileHandle = null;
            this.isDirty = false;
            this.updateTitle();
            this.setLanguage(this.getLanguageFromExtension(file.name));
            const reader = new FileReader();
            reader.onload = (event) => {
                this.editor.setValue(event.target.result);
                this.isDirty = false;
                this.updateTitle();
            };
            reader.readAsText(file);
        };
        input.click();
    }

    async clearContent() {
        if (await this.checkForUnsavedChanges() === 'cancel') return;
        this.editor.setValue('');
        this.fileName = 'Untitled';
        this.fileHandle = null;
        this.isDirty = false;
        this.updateTitle();
    }

    async saveFile() {
        if (this.zenfsPath) {
            await this.saveLocally();
        } else if (this.fileHandle) {
            try {
                await this.writeFile(this.fileHandle);
                this.isDirty = false;
                this.updateTitle();
                this.editor.statusText.textContent = 'File saved.';
                setTimeout(() => this.editor.statusText.textContent = 'Ready', 2000);
            } catch (err) {
                console.error('Error saving file:', err);
            }
        } else {
            await this.saveAs();
        }
    }

    async saveLocally() {
        if (!this.zenfsPath) return;
        try {
            await initFileSystem();
            await fs.promises.writeFile(this.zenfsPath, this.editor.getValue());
            this.isDirty = false;
            this.updateTitle();
            this.editor.statusText.textContent = 'File saved to ZenFS.';
            setTimeout(() => this.editor.statusText.textContent = 'Ready', 2000);
        } catch (err) {
            console.error('Error saving to ZenFS:', err);
            ShowDialogWindow({
                title: "Error",
                text: `Could not save to ZenFS: ${err.message}`,
                buttons: [{ label: "OK", isDefault: true }],
            });
        }
    }

    async saveAs() {
        if (window.showSaveFilePicker) {
            try {
                const fileTypes = languages.map(lang => ({
                    description: lang.name,
                    accept: { [lang.mimeType || 'text/plain']: lang.extensions.map(ext => `.${ext}`) },
                }));
                const handle = await window.showSaveFilePicker({ types: fileTypes, suggestedName: 'Untitled.txt' });
                this.fileHandle = handle;
                this.fileName = handle.name;
                await this.writeFile(handle);
                this.isDirty = false;
                this.updateTitle();
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Error saving file:', err);
            }
        } else {
            const newFileName = prompt("Enter a filename:", this.fileName === 'Untitled' ? 'Untitled.txt' : this.fileName);
            if (!newFileName) return;
            this.fileName = newFileName;
            const blob = new Blob([this.editor.getValue()], { type: 'text/plain' });
            const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
            a.download = this.fileName;
            a.click();
            URL.revokeObjectURL(a.href);
            this.isDirty = false;
            this.updateTitle();
        }
    }

    async writeFile(fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(this.editor.getValue());
        await writable.close();
    }

    pasteText() {
        this.editor.focus();
        navigator.clipboard.readText().then(text => {
            document.execCommand('insertText', false, text);
        }).catch(() => {
            document.execCommand('paste');
        });
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        if (this.editor) {
            this.editor.setLanguage(lang);
        }
        // Update menu state
        if (this.win) {
            this.menuBar = this._createMenuBar();
            this.win.setMenuBar(this.menuBar);
        }
    }

    getInlineStyledHTML() {
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position: absolute; visibility: hidden;';
        const tempPre = document.createElement('pre');
        const tempCode = document.createElement('code');
        tempCode.className = this.editor.highlighted.className;
        tempCode.textContent = this.editor.getValue();
        tempPre.appendChild(tempCode);
        tempDiv.appendChild(tempPre);
        document.body.appendChild(tempDiv);
        hljs.highlightElement(tempCode);

        function applyInlineStyles(element) {
            const styles = window.getComputedStyle(element);
            let styleStr = '';
            if (styles.color) styleStr += `color: ${styles.color}; `;
            if (styles.backgroundColor) styleStr += `background-color: ${styles.backgroundColor}; `;
            if (styles.fontWeight) styleStr += `font-weight: ${styles.fontWeight}; `;
            if (styles.fontStyle) styleStr += `font-style: ${styles.fontStyle}; `;
            if (styleStr) element.setAttribute('style', styleStr);
            Array.from(element.children).forEach(applyInlineStyles);
        }
        applyInlineStyles(tempCode);

        tempPre.style.cssText = 'background-color: #fafafa; padding: 12px; font-family: monospace; white-space: pre; overflow-x: auto;';
        const html = tempPre.outerHTML;
        document.body.removeChild(tempDiv);
        return html;
    }

    copyFormattedCode() {
        try {
            const htmlContent = this.getInlineStyledHTML();
            const tempEl = document.createElement('div');
            tempEl.style.cssText = 'position: absolute; left: -9999px;';
            tempEl.innerHTML = htmlContent;
            document.body.appendChild(tempEl);
            const range = document.createRange();
            range.selectNode(tempEl);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            const successful = document.execCommand('copy');
            document.body.removeChild(tempEl);
            window.getSelection().removeAllRanges();
            this.editor.statusText.textContent = successful ? '✓ Copied to clipboard!' : 'Copy failed!';
        } catch (err) {
            this.editor.statusText.textContent = 'Copy failed!';
        } finally {
            setTimeout(() => this.editor.statusText.textContent = 'Ready', 2000);
        }
    }

    formatCode() {
        if (typeof prettier === 'undefined' || typeof prettierPlugins === 'undefined') {
            this.editor.statusText.textContent = 'Prettier library not loaded.';
            setTimeout(() => this.editor.statusText.textContent = 'Ready', 3000);
            return;
        }

        const language = languages.find(lang => lang.id === this.editor.currentLanguage);
        const parser = language?.prettier;

        if (!parser) {
            this.editor.statusText.textContent = `Formatting not available for ${language?.name || this.editor.currentLanguage}.`;
            setTimeout(() => this.editor.statusText.textContent = 'Ready', 3000);
            return;
        }

        try {
            const formattedCode = prettier.format(this.editor.getValue(), {
                parser: parser,
                plugins: prettierPlugins,
            });
            this.editor.setValue(formattedCode);
            this.isDirty = true;
            this.updateTitle();
            this.editor.statusText.textContent = 'Code formatted successfully.';
        } catch (error) {
            console.error('Prettier formatting error:', error);
            this.editor.statusText.textContent = `Error formatting code: ${error.message.split('\\n')[0]}`;
        } finally {
            setTimeout(() => this.editor.statusText.textContent = 'Ready', 3000);
        }
    }
}
