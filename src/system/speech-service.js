/**
 * SpeechService handles Text-to-Speech (TTS) using the Web Speech API.
 * It provides voice selection, rate/pitch/volume control, and speech lifecycle management.
 */
export class SpeechService {
  constructor() {
    this.voices = [];
    this.isSupported = 'speechSynthesis' in window;
    if (this.isSupported) {
      this._loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
    }
  }

  _loadVoices() {
    this.voices = window.speechSynthesis.getVoices();
  }

  getVoices() {
    return this.voices;
  }

  speak(text, options = {}) {
    if (!this.isSupported) return;

    // Stop current speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);

    if (options.voice) utterance.voice = options.voice;
    if (options.rate) utterance.rate = options.rate;
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.volume) utterance.volume = options.volume;
    if (options.lang) utterance.lang = options.lang;

    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onEnd) utterance.onend = options.onEnd;
    if (options.onError) utterance.onerror = options.onError;
    if (options.onBoundary) utterance.onboundary = options.onBoundary;

    window.speechSynthesis.speak(utterance);
    return utterance;
  }

  stop() {
    if (this.isSupported) {
      window.speechSynthesis.cancel();
    }
  }
}
