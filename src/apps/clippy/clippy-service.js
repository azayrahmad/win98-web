import { initAgent } from 'clippyjs';
import * as agents from 'clippyjs/agents';

/**
 * Ported extensions from the legacy clippy_extensions_complete.js
 * modified to work with the new clippyjs library.
 */
export function extendAgent(agent) {
    /**
     * Get the appropriate goodbye animation name
     */
    agent.getGoodbyeAnimation = function () {
        return this.hasAnimation("Goodbye") ? "Goodbye" : this.hasAnimation("GoodBye") ? "GoodBye" : "Hide";
    };

    agent.exitAnimation = function() {
        this._animator.exitAnimation();
    };

    /**
     * Speak text while simultaneously playing an animation
     */
    agent.speakAndAnimate = function (text, animation, options = {}) {
        const { callback, hold } = options;
        const animationTimeout = options.animationTimeout || 8000;

        if (!this.hasAnimation(animation)) {
            this.speak(text, hold);
            if (callback) setTimeout(callback, 0);
            return;
        }

        this._addToQueue(function (complete) {
            let speechCompleted = false;
            let animationCompleted = false;
            let hasCalledComplete = false;

            const checkCompletion = () => {
                if (speechCompleted && animationCompleted && !hasCalledComplete) {
                    hasCalledComplete = true;
                    if (callback) callback();
                    complete();
                }
            };

            // Force animation completion after timeout
            let animSafetyTimeout = setTimeout(() => {
                if (!animationCompleted) {
                    this.exitAnimation();
                    // Second timeout to force it if exit branch hangs
                    setTimeout(() => {
                        if (!animationCompleted) {
                            animationCompleted = true;
                            checkCompletion();
                        }
                    }, 1000);
                }
            }, animationTimeout);

            this._playInternal(animation, (name, state) => {
                if (state === 0) { // Animator.States.EXITED
                    clearTimeout(animSafetyTimeout);
                    animationCompleted = true;
                    checkCompletion();
                }
            });

            this._balloon.speak(() => {
                speechCompleted = true;
                // For looping animations, we need to explicitly exit them when speech is done
                this.exitAnimation();
                checkCompletion();
            }, text, hold);
        }, this);
    };

    /**
     * Show an interactive input balloon
     */
    agent.ask = function (options = {}) {
        const title = options.title || "What would you like to do?";
        const placeholder = options.placeholder || "Ask me anything...";
        const askButtonText = options.askButtonText || "Ask";
        const cancelButtonText = options.cancelButtonText || "Cancel";
        const timeout = options.timeout || 60000;
        let inputBalloonTimeout = null;

        this.stop();
        // clippyjs's stop() triggers a 2-second hide timeout in the balloon.
        // We must pause it to keep the balloon open for our custom UI.
        this._balloon.pause();

        const balloonContent = `
            <div class="clippy-input">
                <b>${title}</b>
                <textarea rows="2" placeholder="${placeholder}"></textarea>
                <div class="clippy-input-buttons">
                    <button class="ask-button default">${askButtonText}</button>
                    <button class="cancel-button">${cancelButtonText}</button>
                </div>
            </div>`;

        const balloonEl = this._balloon._balloon;
        const contentEl = this._balloon._content;

        this._balloon._hidden = false;
        this._balloon.show();
        contentEl.style.height = 'auto';
        contentEl.style.width = 'auto';
        contentEl.innerHTML = balloonContent;

        this._balloon.reposition();

        const $balloon = $(balloonEl);
        const $input = $balloon.find("textarea");
        const $askButton = $balloon.find(".ask-button");
        const $cancelButton = $balloon.find(".cancel-button");

        $input.focus();

        const resetBalloonTimeout = () => {
            if (inputBalloonTimeout) clearTimeout(inputBalloonTimeout);
            inputBalloonTimeout = setTimeout(() => this.closeBalloon(), timeout);
        };

        const clearBalloonTimeout = () => {
            if (inputBalloonTimeout) clearTimeout(inputBalloonTimeout);
        };

        const askHandler = () => {
            clearBalloonTimeout();
            const question = $input.val();
            if (options.onAsk) options.onAsk(question);
            this.closeBalloon();
        };

        $input.on("keypress", (e) => {
            resetBalloonTimeout();
            if (e.which === 13) {
                e.preventDefault();
                askHandler();
            }
        });

        $askButton.on("click", askHandler);
        $cancelButton.on("click", () => {
            clearBalloonTimeout();
            if (options.onCancel) options.onCancel();
            this.closeBalloon();
        });

        resetBalloonTimeout();
    };

    /**
     * speakStream implementation
     */
    agent.speakStream = async function(asyncIterable, options = {}) {
        const { hold } = options;
        const useTTS = options.tts || this.isTTSEnabled();

        return new Promise((resolve) => {
            this._addToQueue(async function(complete) {
                this._balloon._hidden = false;
                this._balloon.show();
                const contentEl = this._balloon._content;
                contentEl.style.height = 'auto';
                contentEl.style.width = 'auto';
                contentEl.textContent = '';

                // Play an animation during streaming
                if (this.hasAnimation("Explain")) {
                    this._playInternal("Explain");
                }

                let fullText = '';
                try {
                    for await (const chunk of asyncIterable) {
                        fullText += chunk;
                        contentEl.textContent = fullText;
                        this._balloon.reposition();
                    }
                } catch (e) {
                    console.error("Stream error:", e);
                }

                if (useTTS) {
                   const utterance = new SpeechSynthesisUtterance(fullText);
                   window.speechSynthesis.speak(utterance);
                }

                if (this.hasAnimation("Explain")) {
                    this.exitAnimation();
                }

                if (!hold) {
                    setTimeout(() => {
                        this._balloon.hide();
                        complete();
                        resolve();
                    }, this._balloon.CLOSE_BALLOON_DELAY);
                } else {
                    complete();
                    resolve();
                }
            }, this);
        });
    };

    agent.isTTSEnabled = function() {
        return this._ttsEnabled;
    };

    agent.setTTSEnabled = function(enabled) {
        this._ttsEnabled = enabled;
    };

    // Helper for speakAndAnimate with TTS
    const originalSpeakAndAnimate = agent.speakAndAnimate;
    agent.speakAndAnimate = function(text, animation, options = {}) {
        if (options.useTTS === undefined) {
            options.useTTS = this.isTTSEnabled();
        }

        const originalSpeak = this._balloon.speak;
        const self = this;
        this._balloon.speak = function(complete, text, hold) {
            if (options.useTTS) {
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);
            }
            originalSpeak.call(this, complete, text, hold);
        };

        originalSpeakAndAnimate.call(this, text, animation, options);
        this._balloon.speak = originalSpeak;
    };

    agent.setRecommendedVoice = function() {
        // Not implemented for now
    };
}

export async function loadAgent(name) {
    const lowercaseName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const agentLoader = agents[lowercaseName] || agents.Clippy;
    if (!agentLoader) {
        throw new Error(`Agent ${name} not found`);
    }
    const agent = await initAgent(agentLoader);
    extendAgent(agent);
    return agent;
}
